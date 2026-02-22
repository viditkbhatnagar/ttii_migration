<?php
namespace App\Services;

use App\Models\Users_model;

class Otp_service
{
    private $users_model;

    public function __construct()
    {

    }

    public function send_sms_otp($phone_number, $otp)
    {
        $smsApiKey = trim((string) env('SMS_API_KEY'));
        $smsUsername = trim((string) env('SMS_USERNAME'));
        $smsPassword = trim((string) env('SMS_PASSWORD'));
        $smsSender = trim((string) env('SMS_SENDER'));

        if ($smsApiKey === '' || $smsUsername === '' || $smsPassword === '' || $smsSender === '') {
            log_message('error', 'SMS OTP provider is not configured.');
            return false;
        }

        $otp = urlencode($otp);

        $fields = array(
            'username' => $smsUsername,
            'password' => $smsPassword,
            'sendername' => $smsSender,
            'mobileno' => $phone_number,
            'message' => $otp
        );

        $url = "https://2factor.in/API/V1/{$smsApiKey}/SMS/$phone_number/$otp/ApplicationOTP";

        $ch = curl_init();

        //set options
        curl_setopt($ch, CURLOPT_HTTPHEADER, array("Content-type: multipart/form-data"));
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $result = curl_exec($ch);

        curl_close($ch);

//        $fp = fopen('uploads/result.pdf', 'w');
//        fwrite($fp, $result);
//        fclose($fp);
        return $result;
    }

    public function generate_otp($phone_number){
        $digits = 4;
        $otp  = rand(pow(10, $digits-1), pow(10, $digits)-1);

        $this->users_model = new Users_model();
        $this->users_model->edit(['otp' => $otp], ['phone' => $phone_number]);

        return $otp;
    }
}
