import { useState, useEffect, useCallback } from 'react';

const useMenuMobile = () => {
    const [openMenuMobile, setOpenMenuMobile] = useState(false)

    const handleMenuMobile = useCallback(() => {
        setOpenMenuMobile((toggleOpen) => !toggleOpen)
    }, [])

    const closeMenuMobile = useCallback(() => {
        setOpenMenuMobile(false)
    }, [])

    const handleClickOutsideMenuMobile = useCallback((event: Event) => {
        const targetElement = event.target as Element;

        if (openMenuMobile && !targetElement.closest('#menu-mobile')) {
            setOpenMenuMobile(false)
        }
    }, [openMenuMobile]);

    useEffect(() => {
        if (!openMenuMobile) return

        document.addEventListener('click', handleClickOutsideMenuMobile);

        return () => {
            document.removeEventListener('click', handleClickOutsideMenuMobile);
        };
    }, [handleClickOutsideMenuMobile, openMenuMobile])

    return {
        openMenuMobile,
        handleMenuMobile,
        closeMenuMobile,
    }
}

export default useMenuMobile
