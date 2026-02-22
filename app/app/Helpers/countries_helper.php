<?php

if (!function_exists('get_country_code')){
    function get_country_code() {
        $countries = [
                '91'    =>  'INDIA',
                '1'     =>  'CANADA',
                '358'   =>  'FINLAND',
                '33'    =>  'FRANCE',
                '49'    =>  'GERMANY',
                '61'    =>  'AUSTRALIA',
                '353'   =>  'IRELAND',
                '39'    =>  'ITALY',
                '965'   =>  'KUWAIT',
                '370'   =>  'LITHUANIA',
                '64'    =>  'NEW ZEALAND',
                '968'   =>  'OMAN',
                '48'    =>  'POLAND',
                '974'   =>  'QATAR',
                '966'   =>  'SAUDI ARABIA',
                '34'    =>  'SPAIN',
                '46'    =>  'SWEDEN',
                '971'   =>  'UNITED ARAB EMIRATES',
                '44'    =>  'UNITED KINGDOM',
                '1'     =>  'UNITED STATES'
            ];
        return $countries;
    }
}