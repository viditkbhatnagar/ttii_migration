<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upcarrera Notification</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
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
            background: linear-gradient(to right, #086845, #0a875c, #086845);
        }
        .header {
            position: relative;
            padding: 40px;
            text-align: center;
            background: #086845;
        }
        .logo-wrapper {
            position: relative;
            z-index: 1;
            display: inline-block;
            padding: 20px 40px;
            border-radius: 0 0 20px 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
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
        .message-content {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.8;
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            padding: 16px 40px;
            background: #086845;
            color: white !important;
            text-decoration: none !important;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(8,104,69,0.2);
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(8,104,69,0.3);
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
            background: rgba(8,104,69,0.2);
            margin: 15px auto;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="top-accent"></div>
        <div class="header">
            <div class="logo-wrapper">
                <img src="https://project.trogon.info/ttii/assets/app/images/TTII-logo-land.png" alt="TTII Logo" class="logo">
            </div>
        </div>
        <div class="content">
            <div class="notification-card">
                <div class="message-content">
                    <br>
                    <p>Dear <?= $consultant_name ?>,</p>
                    <br>
                    <p>Welcome to ttii! We’re excited to have you as part of our team.</p>
                    <br>
                    <p>Below are your login details for accessing the CRM:</p>
                    <br>
                    <p> Username: <?= $username ?></p>
                    <p> Temporary Password: <?= $password ?></p>
                    <br>
                    <p>To get started, click the button below and log in to your account:</p>
                </div>
            </div>
            <div class="cta-section">
                <a href="<?= $login_url ?>" class="cta-button">Login</a>
            </div>
            <div class="message-content">
                <p>For security purposes, we recommend changing your password after your first login.</p>
                <br>
                <p>If you have any questions or need assistance, feel free to reach out to the coordinator.</p>
                <br>
                <p>Best Regards,</p>
                <p>TTII Education</p>
            </div>
        </div>
        <div class="footer">
            <p class="footer-text">© 2025 TTII Education Pvt Ltd.</p>
            <div class="divider"></div>
            <p class="footer-text">This email was sent to <?= $email ?></p>
        </div>
    </div>
</body>
</html>
