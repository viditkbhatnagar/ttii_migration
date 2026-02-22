<?php
//File: app/Controllers/Api/Login.php

namespace App\Controllers\Api;

use App\Controllers\Api\Api;
use App\Models\Users_model;
use App\Models\User_role_model;
use App\Models\Source_model;
use App\Services\Otp_service;


class Login extends Api
{
    private $users_model;
    public function __construct(){
        helper(['password_reset']);
        $this->users_model = new Users_model();
        $this->source_model = new Source_model(); 
        $this->otp_service = new Otp_service();
    }
    
    /*** User Login ***/
    public function index()
    {
        $this->is_valid_request(['GET']);
        $phone = $this->request->getGet('phone');
        $code = $this->request->getGet('code');
        $password = $this->request->getGet('password');
        $device_id = $this->request->getGet('device_id');
        
        $this->response_data = $this->users_model->login_phone_password($code, $phone,$password,$device_id);
        return $this->set_response();
    }
    
    /*** Verify otp ***/
    public function verify_otp(){
        $this->is_valid_request(['GET']);
        $user_id = $this->request->getGet('user_id');
        $otp = $this->request->getGet('otp');
        $device_id = $this->request->getGet('device_id');
        $this->response_data = $this->users_model->verify_otp($user_id, $otp, $device_id);
        // log_message('error', print_r($this->response_data, true));
        return $this->set_response();
    }
    
    /*** Register New User ***/
    public function register()
    {
        $this->is_valid_request(['GET']);
        $phone = $this->request->getGet('phone');
        $code = $this->request->getGet('code');
        $name = $this->request->getGet('name');
        $password = $this->request->getGet('password');
        $this->response_data = $this->users_model->register_phone($code,$phone,$name,$password);
        return $this->set_response();
    }

    
    public function source_list(){
        $this->is_valid_request(['GET']);
        $sources = $this->source_model->get(NULL,['id', 'source'])->getResultArray();
        $data = [
            'source' => $sources,
        ];
        
        $this->response_data = ['status' => 1,'message' => 'success' , 'data' => $data];
        return $this->set_response();
    }
   

    public function update_source()
    {
        $this->is_valid_request(['GET']);
        $user_id = $this->user_id;
        $source_id = $this->request->getGet('source_id');

        $this->users_model->edit(['source_id' => $source_id], ['id' => $user_id]);
        $this->response_data = ['status' => 1, 'message' => 'success' , 'data' => []];
        return $this->set_response();
    }
    
    
    public function resend_otp(){
        $this->is_valid_request(['GET']);
        $user_id = $this->user_id;
        $user_data = $this->users_model->get(['id' => $user_id], ['email'])->getRowArray();
        $phone_full = $user_data['email'];

        $otp = $this->otp_service->generate_otp($phone_full);
        $this->otp_service->send_sms_otp($phone_full, $otp); 
        
        $updata['verification_code'] = $otp;
        $this->users_model->edit($updata, ['id' => $user_id]);
        $response = ['status' => 1, 'message' => 'OTP Send Successfully!','data'=>['user_id' => $user_id]];
        
        return $response;
    } 


    public function forgot_password(){
        if ($this->request->getMethod() === 'post') {
            // Admin reset by email
            if($this->request->getPost('email')){

                $email = $this->request->getPost('email');
                 // Try to find user by email (for admin)
                $user = $this->users_model->get(['email' => $email])->getRow();

                // If not found, try user_email (for students/others)
                if (!$user) {
                    $user = $this->users_model->get(['user_email' => $email])->getRow();
                }
                if (!$user) {
                    $this->data['error'] = 'No user found with this email.';
                    $this->response_data = ['status' => 0, 'message' => 'No user found with this email.', 'data' => []];
                    return $this->set_response();
                }
                if ($user->role_id == 1) {
                    if($this->send_reset_password_mail_admin($email)){
                        $this->response_data = ['status' => 1, 'message' => 'Reset password link sent to your email', 'data' => []];
                        return $this->set_response();
                    } else {
                        $this->response_data = ['status' => 0, 'message' => 'Failed to send reset link. Please try again.', 'data' => []];
                        return $this->set_response();
                    }
                } elseif ($user->role_id == 2) {
                    if($this->send_reset_password_mail_student($email)){
                        $this->response_data = ['status' => 1, 'message' => 'Reset password link sent to your email', 'data' => []];
                        return $this->set_response();
                    } else {
                        $this->response_data = ['status' => 0, 'message' => 'Failed to send reset link. Please try again.', 'data' => []];
                        return $this->set_response();
                    }
                }
                $this->response_data = ['status' => 0, 'message' => 'Please use your email to reset your password.', 'data' => []];
                return $this->set_response();
            }
            // Student reset by phone
            // elseif($this->request->getPost('country_code') && $this->request->getPost('phone')){
            //     $phone = $this->request->getPost('country_code') . $this->request->getPost('phone');
            //     $user = $this->users_model->get(['email' => $phone])->getRow();
            //     if (!$user) {
            //         $this->data['error'] = 'No user found with this phone number.';
            //         return view('Frontend/Login/forgot_password', $this->data);
            //     }
            //     if ($user->role_id == 2) {
            //         if($this->send_reset_password_mail_student($phone)){
            //             $this->data['success'] = 'Reset password OTP sent to your registered email ID';
            //         } else {
            //             $this->data['error'] = 'Failed to send OTP. Please try again.';
            //         }
            //     } else {
            //         $this->data['error'] = 'Please use your email to reset your password.';
            //     }
            //     return view('Frontend/Login/forgot_password', $this->data);
            // }
            // Neither provided
            else {
                $this->response_data = ['status' => 0, 'message' => 'Please enter your email', 'data' => []];
                return $this->set_response();
            }
        }
        $this->response_data = ['status' => 0, 'message' => 'Invalid request', 'data' => []];
        return $this->set_response();
    }


    private function send_reset_password_mail_admin($email){
        // Fetch user by email
        $user = $this->users_model->get(['email' => $email])->getRowArray();
        if (!$user) {
            // Optionally handle user not found
            log_message('error', 'Password reset requested for non-existent email: ' . $email);
            return false;
        }
        $adminName = $user['name'];
        try {
            $token = generate_password_reset_token(
                (int) $user['id'],
                (string) ($user['email'] ?? ''),
                (string) ($user['password'] ?? '')
            );
        } catch (\Throwable $e) {
            log_message('error', 'Password reset token generation failed: ' . $e->getMessage());
            return false;
        }
        $resetLink = base_url('login/reset_password/' . $user['id'] . '?token=' . urlencode($token));

        $subject = 'Password Reset Request for Your Admin Account - TTII';
        $bodyContent = <<<EOD
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <title>Password Reset Request – Teachers' Training Institute of India</title>
                        </head>
                        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height:1.6; color:#2d3748; background-color:#f7fafc; margin:0; padding:0;">
                            <div style="max-width:650px; margin:20px auto; background:#fff; overflow:hidden;">
                                <div style="height:5px; background:linear-gradient(to right,#8B5CF6,#0a875c,#8B5CF6);"></div>
                                
                                <div style="padding:60px 40px 40px; background:#fff;">
                                    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:30px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                                        <p>Dear {$adminName},</p>
                                        <br>
                                        <p>We received a request to reset the password for your admin account on the <strong>Teachers' Training Institute of India Learning Management System</strong>.</p>
                                        <br>
                                        <p>To reset your password, please click the button below. This link is valid for a limited time only.</p>
                                        
                                        <div style="background:#f8faf9; padding:20px; border-radius:12px; margin:20px 0; border-left:4px solid #8B5CF6;">
                                            <h3 style="font-size:18px; font-weight:600; color:#2d3748; margin-bottom:15px;">Password Reset Link:</h3>
                                            <div style="text-align:center; margin-top:15px;">
                                                <a href="{$resetLink}" style="display:inline-block; background:#8B5CF6; color:#fff; padding:12px 30px; text-decoration:none; border-radius:8px; font-weight:600; margin:10px 0;">Reset Password</a>
                                            </div>
                                        </div>

                                        <p>If you did not request this password reset, please ignore this email or contact our support team at 
                                            <a href="mailto:support@teachersindia.in" style="color:#8B5CF6;">support@teachersindia.in</a>.
                                        </p>
                                        <br>
                                        <p>Thank you,<br><strong>Teachers' Training Institute of India</strong></p>
                                    </div>
                                </div>

                                <div style="background:#f8faf9; padding:30px; text-align:center; border-top:1px solid #e2e8f0;">
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                                    <div style="width:60px; height:2px; background:rgba(139,92,246,0.2); margin:15px auto;"></div>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">© 2025 Teachers' Training Institute of India</p>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">This email was sent to {$email}</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        EOD;

        send_email_message($email, $adminName, $subject, $bodyContent, 'TTII Education');
        return true;
    }

    // ... existing code ...
    private function send_reset_password_mail_student($email){
        // Fetch user by email
        $user = $this->users_model->get(['user_email' => $email])->getRowArray();
        if (!$user) {
            // Optionally handle user not found
            log_message('error', 'Password reset requested for non-existent email: ' . $email);
            return false;
        }
        $user_email = $user['user_email'];
        $studentName = $user['name'];
        try {
            $token = generate_password_reset_token(
                (int) $user['id'],
                (string) ($user['user_email'] ?? ''),
                (string) ($user['password'] ?? '')
            );
        } catch (\Throwable $e) {
            log_message('error', 'Password reset token generation failed: ' . $e->getMessage());
            return false;
        }
        $resetLink = base_url('login/reset_password/' . $user['id'] . '?token=' . urlencode($token));

        $subject = 'Password Reset Request for Your Student Account - TTII';
        $bodyContent = <<<EOD
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <title>Password Reset Request – Teachers' Training Institute of India</title>
                        </head>
                        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height:1.6; color:#2d3748; background-color:#f7fafc; margin:0; padding:0;">
                            <div style="max-width:650px; margin:20px auto; background:#fff; overflow:hidden;">
                                <div style="height:5px; background:linear-gradient(to right,#8B5CF6,#0a875c,#8B5CF6);"></div>
                                
                                <div style="padding:60px 40px 40px; background:#fff;">
                                    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:30px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                                        <p>Dear {$studentName},</p>
                                        <br>
                                        <p>We received a request to reset the password for your student account on the <strong>Teachers' Training Institute of India Learning Management System</strong>.</p>
                                        <br>
                                        <p>To reset your password, please click the button below. This link is valid for a limited time only.</p>
                                        
                                        <div style="background:#f8faf9; padding:20px; border-radius:12px; margin:20px 0; border-left:4px solid #8B5CF6;">
                                            <h3 style="font-size:18px; font-weight:600; color:#2d3748; margin-bottom:15px;">Password Reset Link:</h3>
                                            <div style="text-align:center; margin-top:15px;">
                                                <a href="{$resetLink}" style="display:inline-block; background:#8B5CF6; color:#fff; padding:12px 30px; text-decoration:none; border-radius:8px; font-weight:600; margin:10px 0;">Reset Password</a>
                                            </div>
                                        </div>

                                        <p>If you did not request this password reset, please ignore this email or contact our support team at 
                                            <a href="mailto:support@teachersindia.in" style="color:#8B5CF6;">support@teachersindia.in</a>.
                                        </p>
                                        <br>
                                        <p>Thank you,<br><strong>Teachers' Training Institute of India</strong></p>
                                    </div>
                                </div>

                                <div style="background:#f8faf9; padding:30px; text-align:center; border-top:1px solid #e2e8f0;">
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
                                    <div style="width:60px; height:2px; background:rgba(139,92,246,0.2); margin:15px auto;"></div>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">© 2025 Teachers' Training Institute of India</p>
                                    <p style="color:#718096; font-size:14px; margin:5px 0;">This email was sent to {$user_email}</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        EOD;


        send_email_message($user_email, $studentName, $subject, $bodyContent, 'TTII Education');
        return true;
    }

}
