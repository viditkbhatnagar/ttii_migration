<?php
// Private helper function
if (!function_exists('_get_session_value')){
    function _get_session_value($session_key) {
        $session = session();
        return $session->get($session_key);
    }
}

if (!function_exists('get_user_id')){
    function get_user_id() {
        return _get_session_value('user_id');
    }
}

if (!function_exists('get_role_id')){
    function get_role_id() {
        return _get_session_value('role_id');
    }
}

if (!function_exists('get_role_title')){
    function get_role_title() {
        return _get_session_value('role_title');
    }
}

if (!function_exists('get_user_name')){
    function get_user_name() {
        return _get_session_value('user_name');
    }
}

if (!function_exists('get_user_profile')){
    function get_user_profile() {
        return _get_session_value('user_profile');
    }
}

if (!function_exists('is_logged_in')){
    function is_logged_in() {
        $is_logged_in = _get_session_value('is_logged_in');
        $is_user_id = _get_session_value('user_id') > 0;
        return $is_user_id && $is_logged_in;
    }
}

if (!function_exists('check_login')){
    function check_login() {
        if (!is_logged_in()){
            session()->setFlashdata('message', 'Session expired, Login Again!');
            return redirect()->to(base_url('login'));
        }
    }
}


if (!function_exists('is_admin')){
    function is_admin() {
        if (get_role_id()==1){
            return true;
        }
        return false;
    }
}

if (!function_exists('is_subadmin')){
    function is_subadmin() {
        if (get_role_id()==8){
            return true;
        }
        return false;
    }
}

if (!function_exists('is_centre')){
    function is_centre() {
        if (get_role_id()==7){
            return true;
        }
        return false;
    }
}

if (!function_exists('is_student')){
    function is_student() {
        if (get_role_id()==2){
            return true;
        }
        return false;
    }
}
// if (!function_exists('is_centre')){
//     function is_centre() {
//         if (get_role_id()==7){
//             return true;
//         }
//         return false;
//     }
// }


if (!function_exists('is_instructor')){
    function is_instructor() {
        if (get_role_id()==3){
            return true;
        }
        return false;
    }
}


if (!function_exists('is_counsellor')){
    function is_counsellor() {
        if (get_role_id()==9){
            return true;
        }
        return false;
    }
}

if (!function_exists('is_associate')){
    function is_associate() {
        if (get_role_id()==10){
            return true;
        }
        return false;
    }
}

if (!function_exists('is_team_lead')){
    function is_team_lead() {
        if (get_role_id()==4){
            return true;
        }
        return false;
    }
}























