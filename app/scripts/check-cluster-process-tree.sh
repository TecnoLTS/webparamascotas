#!/bin/sh
set -eu

expected_workers="${1:-}"
init_pid="${CLUSTER_INIT_PID:-1}"

case "$expected_workers" in
  ''|0|0*|*[!0-9]*)
    echo "expected workers debe ser un entero entre 1 y 16." >&2
    exit 64
    ;;
esac
if [ "$expected_workers" -gt 16 ]; then
  echo "expected workers debe ser un entero entre 1 y 16." >&2
  exit 64
fi
case "$init_pid" in
  ''|0|0*|*[!0-9]*)
    echo "CLUSTER_INIT_PID debe ser un PID positivo." >&2
    exit 64
    ;;
esac

primary_pid=""
for process_dir in /proc/[0-9]*; do
  pid="${process_dir#/proc/}"
  [ "$pid" != "$init_pid" ] || continue
  [ -r "$process_dir/cmdline" ] || continue
  if ! tr '\000' '\n' < "$process_dir/cmdline" | grep -Eq '(^|/)cluster-server[.]cjs$'; then
    continue
  fi
  parent_pid="$(awk '$1 == "PPid:" { print $2; exit }' "$process_dir/status" 2>/dev/null || true)"
  [ "$parent_pid" = "$init_pid" ] || continue
  if [ -n "$primary_pid" ]; then
    echo "Se detecto mas de un primary frontend hijo de PID ${init_pid}." >&2
    exit 1
  fi
  primary_pid="$pid"
done

if [ -z "$primary_pid" ]; then
  echo "No se encontro el primary cluster-server.cjs hijo de PID ${init_pid}." >&2
  exit 1
fi

primary_uid="$(awk '$1 == "Uid:" { print $2; exit }' "/proc/${primary_pid}/status")"
worker_count=0
for process_dir in /proc/[0-9]*; do
  [ -r "$process_dir/status" ] || continue
  parent_pid="$(awk '$1 == "PPid:" { print $2; exit }' "$process_dir/status" 2>/dev/null || true)"
  [ "$parent_pid" = "$primary_pid" ] || continue

  state="$(awk '$1 == "State:" { print $2; exit }' "$process_dir/status")"
  uid="$(awk '$1 == "Uid:" { print $2; exit }' "$process_dir/status")"
  if [ "$state" = "Z" ] || [ "$uid" != "$primary_uid" ]; then
    echo "Worker frontend invalido en ${process_dir}: state=${state:-?} uid=${uid:-?}." >&2
    exit 1
  fi
  worker_count=$((worker_count + 1))
done

if [ "$worker_count" -ne "$expected_workers" ]; then
  echo "Cluster frontend incompleto: primary=${primary_pid}, workers=${worker_count}, esperados=${expected_workers}." >&2
  exit 1
fi

echo "Frontend cluster process tree OK: primary=${primary_pid}, workers=${worker_count}."
