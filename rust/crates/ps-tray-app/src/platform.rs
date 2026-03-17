/// Platform-specific window management utilities.

pub const WINDOW_TITLE: &str = "PurpleSector \u{2014} Tray App";

/// Hide the app window to the system tray (Windows).
/// Must be called while the eframe event loop is still running.
#[cfg(windows)]
pub fn hide_to_tray() {
    win32::set_window_visibility(WINDOW_TITLE, false);
}

/// Restore the app window from the system tray (Windows).
/// Brings the window back and focuses it.
#[cfg(windows)]
pub fn show_from_tray() {
    win32::set_window_visibility(WINDOW_TITLE, true);
}

#[cfg(windows)]
mod win32 {
    use std::iter;

    type HWND = *mut core::ffi::c_void;
    type LPCWSTR = *const u16;
    type BOOL = i32;

    const SW_HIDE: i32 = 0;
    const SW_SHOW: i32 = 5;

    #[link(name = "user32")]
    extern "system" {
        fn FindWindowW(lpClassName: LPCWSTR, lpWindowName: LPCWSTR) -> HWND;
        fn ShowWindow(hWnd: HWND, nCmdShow: i32) -> BOOL;
        fn SetForegroundWindow(hWnd: HWND) -> BOOL;
    }

    pub fn set_window_visibility(title: &str, visible: bool) {
        let wide: Vec<u16> = title.encode_utf16().chain(iter::once(0)).collect();
        unsafe {
            let hwnd = FindWindowW(core::ptr::null(), wide.as_ptr());
            if !hwnd.is_null() {
                ShowWindow(hwnd, if visible { SW_SHOW } else { SW_HIDE });
                if visible {
                    SetForegroundWindow(hwnd);
                }
            }
        }
    }
}
