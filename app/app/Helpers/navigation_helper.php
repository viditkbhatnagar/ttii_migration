<?php
if (!function_exists('is_active_menu')){
    function is_active_menu($page_name, $menu_name) {
        return strtolower($page_name) == $menu_name;
    }
}

if (!function_exists('show_active_menu')){
    function show_active_menu($page_name, $menu_name) {
        if (is_active_menu($page_name, $menu_name)){
            echo "active";
        }
    }
}

if (!function_exists('is_settings_menu')){
    function is_settings_menu($page_name) {
        $settings_pages = [
            'Lead_status/index', 'Candidate_status/index', 'Lead_source/index', 'User_role/index', 'Country/index',
            'Course/index', 'Fee_type/index', 'Subjects/index'
        ];

        return in_array($page_name, $settings_pages);
    }
}

if (!function_exists('show_settings_menu')){
    function show_settings_menu($page_name) {
        if (is_settings_menu($page_name)){
           echo 'show';
        }
    }
}

if (!function_exists('is_users_menu')){
    function is_users_menu($page_name) {
        $users_pages = [
            'Admin/index', 'Telecallers/index', 'Teachers/index', 'Institutions/index', 'Accountants/index'
        ];

        return in_array($page_name, $users_pages);
    }
}

if (!function_exists('show_users_menu')){
    function show_users_menu($page_name) {
        if (is_users_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_consultant_menu')){
    function is_consultant_menu($page_name) {
        $consultant_pages = [
            'Consultant/overview','Consultant/index','Consultant/performance','Consultant/admissions','Consultant/source_analytics', 'Consultant/revenue'
        ];

        return in_array($page_name, $consultant_pages);
    }
}

if (!function_exists('show_consultant_menu')){
    function show_consultant_menu($page_name) {
        if (is_consultant_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_sales_menu')){
    function is_sales_menu($page_name) {
        $sales_pages = [
            'Sales_team/overview','Sales_team/directory','Sales_team/team_leader_insights','Sales_team/performance_by_source','Sales_team/activity_logs','Sales_team/reports_and_exports'
        ];

        return in_array($page_name, $sales_pages);
    }
}

if (!function_exists('show_sales_menu')){
    function show_sales_menu($page_name) {
        if (is_sales_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_clients_menu')){
    function is_clients_menu($page_name) {
        $sales_pages = [
            'Client/index', 'Client/referral', 'Client/finance', 'Client/communication_logs', 'Client/analytics', 'Client/report', 'Client/notification'
        ];

        return in_array($page_name, $sales_pages);
    }
}

if (!function_exists('show_clients_menu')){
    function show_clients_menu($page_name) {
        if (is_clients_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_students_menu')){
    function is_students_menu($page_name) {
        $students_pages = [
            'Students/index','Students/communication_logs','Students/association','Students/analytics','Students/notification'
        ];

        return in_array($page_name, $students_pages);
    }
}

if (!function_exists('show_students_menu')){
    function show_students_menu($page_name) {
        if (is_students_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_academics_menu')){
    function is_academics_menu($page_name) {
        $academics_pages = [
            'Course/index','Course/analytics', 'University/index', 'University/analytics', 'Academics/index', 'Academics/calendar', 'Academics/revenue_tracting', 'Academics/report'
        ];

        return in_array($page_name, $academics_pages);
    }
}

if (!function_exists('show_academics_menu')){
    function show_academics_menu($page_name) {
        if (is_academics_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_finance_menu')){
    function is_finance_menu($page_name) {
        $finance_pages = [
            'Finance/fee_management', 'University_commission/index', 'Finance/revenue_analysis', 'Finance/student_fee_summary', 'Finance/outstanding_payments', 'Finance/scholarships', 'Invoice/index', 'Finance/report', 'Finance/notification'
        ];

        return in_array($page_name, $finance_pages);
    }
}

if (!function_exists('show_finance_menu')){
    function show_finance_menu($page_name) {
        if (is_finance_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_dashboard_menu')){
    function is_dashboard_menu($page_name) {
        $dashboard_pages = [
            'Admin/index', 'Telecallers/index', 'Teachers/index', 'Institutions/index', 'Accountants/index'
        ];

        return in_array($page_name, $dashboard_pages);
    }
}

if (!function_exists('show_dashboard_menu')){
    function show_dashboard_menu($page_name) {
        if (is_dashboard_menu($page_name)){
           echo 'show';
        }
    }
}

if (!function_exists('is_accounts_menu')){
    function is_accounts_menu($page_name) {
        $settings_pages = [
            'Invoice/index', 'University_commission/index'
        ];

        return in_array($page_name, $settings_pages);
    }
}

if (!function_exists('show_accounts_menu')){
    function show_accounts_menu($page_name) {
        if (is_accounts_menu($page_name)){
           echo 'show';
        }
    }
}

if (!function_exists('is_reports_menu')){
    function is_reports_menu($page_name) {
        $settings_pages = [
            'Reports/students_report', ''
        ];

        return in_array($page_name, $settings_pages);
    }
}

if (!function_exists('show_reports_menu')){
    function show_reports_menu($page_name) {
        if (is_reports_menu($page_name)){
           echo 'show';
        }
    }
}
if (!function_exists('is_semester_menu')){
    function is_semester_menu($page_name) {
        $academics_pages = [
            'Course/index','University/index','College/index',
        ];

        return in_array($page_name, $academics_pages);
    }
}

if (!function_exists('show_semester_menu')){
    function show_semester_menu($page_name) {
        if (is_semester_menu($page_name)){
           echo 'show';
        }
    }
}

if (!function_exists('show_active_main_menu')) {
    function show_active_main_menu($page_name, $menu_names = []) {
        // echo "<pre>".$page_name."-"; print_r($menu_names); echo "</pre>";
        if (in_array($page_name, $menu_names)) {
            echo "show";
        } else {
            echo "collapse";
        }
    }
}
