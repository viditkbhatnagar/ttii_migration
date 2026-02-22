<?php
if (!function_exists('has_permission')){
    function has_permission($permission) {
        if (is_admin()){
            return has_permission_admin($permission);
        }elseif (is_subadmin()){
            return has_permission_subadmin($permission);
        }elseif (is_instructor()){
            return has_permission_instructor($permission);
        }elseif (is_student()){
            return has_permission_student($permission);
        }elseif (is_centre()){
            return has_permission_centre($permission);
        }elseif (is_counsellor()){
            return has_permission_counsellor($permission);
        }elseif(is_associate()){
            return has_permission_associate($permission);
        }else{
            return false;
        }
    }
}


// Permission Admin
if (!function_exists('has_permission_admin')){
    function has_permission_admin($permission) {
        $permissions = [
            'employee_attendance_report/index'
        ];
        return !in_array($permission, $permissions);
    }
}

if (!function_exists('has_permission_subadmin')){
    function has_permission_subadmin($permission) {
        $permissions = [
            'employee_attendance_report/index'
        ];
        return !in_array($permission, $permissions);
    }
}

// Permission HR & Administration
if (!function_exists('has_permission_hr')){
    function has_permission_hr($permission) {
        $permissions = [
            'ip_restriction/index',
            'user_role/index',
            'app_category/index',
            'teams/index',
            'over_time/requests',
            'leave_request/requests'
        ];
        return !in_array($permission, $permissions);
    }
}

// Permission Employee
if (!function_exists('has_permission_student')){
    function has_permission_student($permission) {
        $permissions = [
            'desk_time/index',
            
        ];
        return in_array($permission, $permissions);
    }
}

// Permission Centre
if (!function_exists('has_permission_centre')){
    function has_permission_centre($permission) {
        $permissions = [
            'dashboard/index',
            'students/index',
            'students/applications',
            // 'centres/index',
            // 'centres/add',
            'resources/index',
            'training_videos/index',
            'support/index',
            'notification/index',
            // 'feed/index',
            // 'settings/system',
            'integration/index',
            'review/index',
            'faq/index',
            'language/index',
            'app_version/index',
            'applications/add',
            'Cohorts/index',
            'cohorts/index',
            'wallet/index',
            'courses/index',
            
            
            
        ];
        return in_array($permission, $permissions);
    }
}


// Permission Team Lead
if (!function_exists('has_permission_team_lead')){
    function has_permission_team_lead($permission) {
        $permissions = [
            'over_time/requests',
            'leave_request/requests'
        ];
        return in_array($permission, $permissions);
    }
}

if (!function_exists('has_permission_instructor')){
    function has_permission_instructor($permission) {
        $permissions = [
            'course/index',
            'Cohorts/index',
            'cohorts/index',
            'cohorts/add',
            'Assignment/index'
        ];
        return in_array($permission, $permissions);
    }
}



if (!function_exists('has_permission_counsellor')){
    function has_permission_counsellor($permission) {
        $permissions = [
            'dashboard/index',
            'students/index',
            'students/applications',
            'Course/index',
            'course/index',
            'applications/add'
        ];
        return in_array($permission, $permissions);
    }
}

if (!function_exists('has_permission_associate')){

    function has_permission_associate($permission) {
        $permissions = [
            'dashboard/index',
            'students/index',
            'students/applications',
            'Course/index',
            'course/index',
            'applications/add'
        ];
        return in_array($permission, $permissions);
    }
}


