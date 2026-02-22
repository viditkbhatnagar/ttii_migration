<?php
namespace App\Controllers\Admin;
use App\Models\Users_model;
class Sub_admin extends AppBaseController
{
    private $users_model;
    public function __construct()
    {
        parent::__construct();
        $this->users_model = new Users_model();
        
    }

    public function index(){
        $this->data['list_items'] = $this->users_model->get(['role_id' => 8])->getResultArray();
        $this->data['page_title'] = 'Admin';
        $this->data['page_name'] = 'Sub_admin/index';
        return view('Admin/index', $this->data);
    }
    
    public function add(){
        if ($this->request->getMethod() === 'post'){

        $check_email_duplication = $this->users_model->get(['user_email' => $this->request->getPost('email'), 'role_id' => 8])->getNumRows();
        if($check_email_duplication > 0){
            session()->setFlashdata('message_danger', "Email Already Exists");
            return redirect()->to(base_url('admin/sub_admin/index'));
        }
            $data = [
                'name'      => $this->request->getPost('name'),
                'user_email'     => $this->request->getPost('email'),
                'country_code'     => $this->request->getPost('code'),
                'phone'     =>  $this->request->getPost('phone'),
                'email'     => $this->request->getPost('phone'),
                'role_id'   => 8,
                'password'  => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => get_user_id()
            ];
                
            $admin_id = $this->users_model->add($data);
            if ($admin_id){

                $user = $this->users_model->get(['id' => $admin_id])->getRowArray();
                $this->send_account_creation_mail($user,$this->request->getPost('password'));

                session()->setFlashdata('message_success', "Admin Added Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }

            return redirect()->to(base_url('admin/sub_admin/index'));
        } else {
            $this->data['country_code'] = get_country_code();
            echo view('Admin/Sub_admin/add', $this->data);
        }
        
    }


    public function edit($id){
        if ($this->request->getMethod() === 'post'){
            $check_email_duplication = $this->users_model->get(['user_email' => $this->request->getPost('email'), 'id !=' => $id, 'role_id' => 8])->getNumRows();
            if($check_email_duplication > 0){
                session()->setFlashdata('message_danger', "Email Already Exists");
                return redirect()->to(base_url('admin/sub_admin/index'));
            }
            $data = [
                'name'      => $this->request->getPost('name'),
                'user_email'     => $this->request->getPost('email'),
                'country_code'     => $this->request->getPost('code'),
                'phone'     => $this->request->getPost('phone'),
                'email'     => $this->request->getPost('phone'),
                'updated_by' => get_user_id(),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            if(!empty($this->request->getPost('password'))){
                $data['password'] = password_hash($this->request->getPost('password'), PASSWORD_DEFAULT);
            }

            $response = $this->users_model->edit($data, ['id' => $id]);
            if ($response){
                session()->setFlashdata('message_success', "Admin Updated Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
           
            return redirect()->to(base_url('admin/sub_admin/index'));
        } else {
            $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
            $this->data['country_code'] = get_country_code();
            echo view('Admin/Sub_admin/edit', $this->data);
        }
        
    }

    public function view($id){
        $this->data['view_data'] = $this->users_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Sub_admin/view', $this->data);
    }
    
    public function delete($id){
        if ($id > 0){
            if ($this->users_model->remove(['id' => $id])){
                session()->setFlashdata('message_success', "Admin Deleted Successfully!");
            }else{
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }else{
            session()->setFlashdata('message_danger', "Something went wrong! Try Again");
        }
        return redirect()->to(base_url('admin/sub_admin/index'));
    }

    public function reset_password($id){
        if ($this->request->getMethod() === 'post'){
            $prev_password = $this->users_model->get(['id' => $id], ['password'])->getRow()->password;
            $username = $this->request->getPost('username');
            $check_username_duplication = $this->users_model->get(['username' => $username, 'id !=' => $id])->getNumRows();
            if($check_username_duplication == 0){
                $data = [
                    'username' =>  $username,
                    'prev_password'  => $prev_password,
                    'password'  => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
                    'updated_by' => get_user_id(),
                    'updated_at' => date('Y-m-d H:i:s'),
                ];
             
                $response = $this->users_model->edit($data, ['id' => $id]);
                if ($response){
                    session()->setFlashdata('message_success', "Password Updated Successfully!");
                }else{
                    session()->setFlashdata('message_danger', "Something went wrong! Try Again");
                }
            }else{
                session()->setFlashdata('message_danger', "Username Already Exists");
            }
            return redirect()->to(base_url('admin/sub_admin/index'));
        } else {
            $this->data['id'] = $id;
            $this->data['edit_data'] = $this->users_model->get(['id' => $id])->getRowArray();
            echo view('Admin/Sub_admin/reset_password', $this->data);
        }
        
    }

    
    private function send_account_creation_mail($user,$password)
    {
        $subject = 'Your Admin Account at Teachers\' Training Institute of India is Ready';

        $toEmail = $user['email'];
        $toName = $user['name'];
        
        $bodyContent = "<!DOCTYPE html>
        <html lang=\"en\">
        <head>
            <meta charset=\"UTF-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Welcome to TTII Admin Portal</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #2d3748;
                    background-color: #f7fafc;
                }
                .email-container {
                    max-width: 650px;
                    margin: 20px auto;
                    background: #ffffff;
                    overflow: hidden;
                }
                .top-accent {
                    height: 5px;
                    background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6);
                }
                .header {
                    position: relative;
                    padding: 40px;
                    text-align: center;
                    background: #8B5CF6;
                }
                .header::after {
                    content: '';
                    position: absolute;
                    bottom: -20px;
                    left: 0;
                    right: 0;
                    height: 40px;
                    background: #8B5CF6;
                    transform: skewY(-2deg);
                }
                .logo-wrapper {
                    position: relative;
                    z-index: 1;
                    display: inline-block;
                    padding: 20px 40px;
                    border-radius: 0 0 20px 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    background: #fff;
                }
                .logo {
                    max-width: 150px;
                    height: auto;
                }
                .content {
                    position: relative;
                    padding: 60px 40px 40px;
                    background: white;
                }
                .notification-card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 30px;
                    margin-bottom: 40px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
                .tag {
                    display: inline-block;
                    padding: 6px 12px;
                    background: rgba(139,92,246,0.1);
                    color: #8B5CF6;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 20px;
                }
                .message-content {
                    color: #4a5568;
                    font-size: 16px;
                    line-height: 1.8;
                }
                .login-details {
                    background: #f8faf9;
                    padding: 25px;
                    border-radius: 12px;
                    margin: 20px 0;
                    border-left: 4px solid #8B5CF6;
                }
                .login-details h3 {
                    margin-bottom: 10px;
                    color: #2d3748;
                }
                .cta-section {
                    text-align: center;
                    margin: 30px 0;
                }
                .cta-button {
                    display: inline-block;
                    padding: 16px 40px;
                    background: #8B5CF6;
                    color: white !important;
                    text-decoration: none !important;
                    border-radius: 8px;
                    font-weight: 600;
                    box-shadow: 0 4px 6px rgba(139,92,246,0.3);
                }
                .footer {
                    background: #f8faf9;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 5px 0;
                }
                .divider {
                    width: 60px;
                    height: 2px;
                    background: rgba(139,92,246,0.2);
                    margin: 15px auto;
                }
                @media only screen and (max-width: 768px) {
                    .email-container { margin: 0; max-width: 100%; }
                    .header { padding: 30px 20px; }
                    .content { padding: 40px 20px 20px; }
                    .logo { max-width: 120px; }
                    .notification-card { padding: 20px; }
                }
                @media only screen and (max-width: 480px) {
                    .content { padding: 30px 15px; }
                    .logo { max-width: 100px; }
                    .message-content { font-size: 14px; }
                    .cta-button { width: 100%; max-width: 280px; }
                }
            </style>
        </head>
        <body>
        <div class=\"email-container\">
            <div class=\"top-accent\"></div>

            <div class=\"header\">
                <div class=\"logo-wrapper\">
                    <img src=\"" . base_url() . "/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg\" alt=\"TTII Logo\" class=\"logo\">
                </div>
            </div>

            <div class=\"content\">
                <div class=\"notification-card\">
                    <div class=\"tag\">Admin Access</div>

                    <div class=\"message-content\">
                        <p>Dear {$toName},</p><br>

                        <p>Welcome to <strong>Teachers' Training Institute of India</strong>!</p><br>

                        <p>Your admin account has been successfully created on our Learning Management System (LMS). You can now access the admin portal and begin managing the platform.</p>

                        <div class=\"login-details\">
                            <h3>Login Details</h3>
                            <p><strong>Username:</strong> {$user['email']}</p>
                            <p><strong>Temporary Password:</strong> {$password}</p>
                        </div>

                        <p>Please log in using the button below and change your password immediately for security reasons.</p>
                    </div>
                </div>

                <div class=\"cta-section\">
                    <a href=\"" . base_url('login/index') . "\" class=\"cta-button\">Login to Admin Portal</a>
                </div>
            </div>

            <div class=\"footer\">
                <p class=\"footer-text\"><strong>Teachers' Training Institute of India</strong></p>
                <div class=\"divider\"></div>
                <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
                <p class=\"footer-text\">This email was sent to {$toEmail}</p>
            </div>
        </div>
        </body>
        </html>";

            send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
    }

    // private function send_account_creation_mail($user,$password)
    // {
    //     $subject = 'Your Admin Account at Teachers\' Training Institute of India is Ready';

    //     $toEmail = $user['email'];
    //     $toName = $user['name'];

    //     $bodyContent = "<!DOCTYPE html>
    //         <html lang=\"en\">
    //         <head>
    //             <meta charset=\"UTF-8\">
    //             <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    //             <title>Welcome to TTII Admin Portal</title>
    //             <style>
    //                 * {
    //                     margin: 0;
    //                     padding: 0;
    //                     box-sizing: border-box;
    //                 }
    //                 body {
    //                     font-family: 'Segoe UI', Arial, sans-serif;
    //                     line-height: 1.6;
    //                     color: #2d3748;
    //                     background-color: #f7fafc;
    //                 }
    //                 .email-container {
    //                     max-width: 650px;
    //                     margin: 20px auto;
    //                     background: #ffffff;
    //                     overflow: hidden;
    //                 }
    //                 .top-accent {
    //                     height: 5px;
    //                     background: linear-gradient(to right, #8B5CF6, #0a875c, #8B5CF6);
    //                 }
    //                 .content {
    //                     position: relative;
    //                     padding: 60px 40px 40px;
    //                     background: white;
    //                 }
    //                 .notification-card {
    //                     background: white;
    //                     border: 1px solid #e2e8f0;
    //                     border-radius: 16px;
    //                     padding: 30px;
    //                     margin-bottom: 30px;
    //                     box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    //                 }
    //                 .message-content {
    //                     color: #4a5568;
    //                     font-size: 16px;
    //                     line-height: 1.8;
    //                 }
    //                 .login-details {
    //                     background: #f8faf9;
    //                     padding: 20px;
    //                     border-radius: 12px;
    //                     margin: 20px 0;
    //                     border-left: 4px solid #8B5CF6;
    //                 }
    //                 .login-button {
    //                     display: inline-block;
    //                     background: #8B5CF6;
    //                     color: white;
    //                     padding: 12px 30px;
    //                     text-decoration: none;
    //                     border-radius: 8px;
    //                     font-weight: 600;
    //                     margin: 20px 0;
    //                     transition: background-color 0.3s;
    //                 }
    //                 .login-button:hover {
    //                     background: rgb(217 99 9);
    //                 }
    //                 .footer {
    //                     background: #f8faf9;
    //                     padding: 30px;
    //                     text-align: center;
    //                     border-top: 1px solid #e2e8f0;
    //                 }
    //                 .footer-text {
    //                     color: #718096;
    //                     font-size: 14px;
    //                     margin: 5px 0;
    //                 }
    //                 .divider {
    //                     width: 60px;
    //                     height: 2px;
    //                     background: rgba(139,92,246,0.2);
    //                     margin: 15px auto;
    //                 }
    //                 @media only screen and (max-width: 768px) {
    //                     .email-container { margin: 0; max-width: 100%; }
    //                     .header { padding: 30px 20px; }
    //                     .content { padding: 40px 20px 20px; }
    //                     .logo-wrapper { padding: 15px 25px; }
    //                     .logo { max-width: 120px; }
    //                     .notification-card { padding: 20px; margin-bottom: 30px; }
    //                     .info-grid { flex-direction: column; gap: 15px; }
    //                     .info-box { flex: 1 1 100%; margin-bottom: 15px; }
    //                     .cta-button { padding: 14px 30px; font-size: 14px; }
    //                 }
    //                 @media only screen and (max-width: 480px) {
    //                     .email-container { margin: 0; }
    //                     .header { padding: 20px 15px; }
    //                     .content { padding: 30px 15px 15px; }
    //                     .logo-wrapper { padding: 12px 20px; }
    //                     .logo { max-width: 100px; }
    //                     .notification-card { padding: 15px; margin-bottom: 20px; }
    //                     .message-content { font-size: 14px; }
    //                     .cta-button { padding: 12px 25px; font-size: 13px; width: 100%; max-width: 280px; }
    //                     .info-box { padding: 20px; }
    //                     .info-label { font-size: 11px; }
    //                     .info-content { font-size: 14px; }
    //                     .footer { padding: 20px 15px; }
    //                     .footer-text { font-size: 13px; }
    //                 }
    //             </style>
    //         </head>
    //         <body>
    //             <div class=\"email-container\">
    //                 <div class=\"top-accent\"></div>
                    
    //                 <div class=\"content\">
    //                     <div class=\"notification-card\">
    //                         <div class=\"message-content\">
    //                             <p>Dear {$toName},</p>
    //                             <br>
    //                             <p>Welcome to Teachers' Training Institute of India!</p>
    //                             <br>
    //                             <p>Your admin account has been successfully created on our Learning Management System (LMS). You can now access the admin portal and begin managing the platform.</p>
                                
    //                             <div class=\"login-details\">
    //                                 <h3>Login Details:</h3>
    //                                 <p>Username: {$user['email']}</p>
    //                                 <p>Temporary Password: {$password}</p>
    //                             </div>

    //                             <p>Please log in using the link below and change your password to ensure the security of your account:</p>
    //                             <br>
    //                             <div style=\"text-align: center;\">
    //                                 <a href=\"" . base_url('login/index') . "\" class=\"login-button\">Login URL</a>
    //                             </div>
    //                             <br>
    //                             <p>If you encounter any issues or have questions, feel free to contact our support team at <a href=\"mailto:support@teachersindia.in\" style=\"color: #8B5CF6;\">support@teachersindia.in</a>.</p>
    //                         </div>
    //                     </div>
    //                 </div>
                    
    //                 <div class=\"footer\">
    //                     <p class=\"footer-text\">Best regards,<br><strong>Teachers' Training Institute of India</strong></p>
    //                     <div class=\"divider\"></div>
    //                     <p class=\"footer-text\">© 2025 Teachers' Training Institute of India</p>
    //                     <p class=\"footer-text\">This email was sent to {$toEmail}</p>
    //                 </div>
    //             </div>
    //         </body>
    //         </html>";

    //         send_email_message($toEmail, $toName, $subject, $bodyContent, 'TTII Education');
    // }



}
