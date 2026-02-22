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
                <img src="https://project.trogon.info/ttii/assets/app/images/TTII-logo-land.png" alt="Upcarrera Logo" class="logo">
            </div>
        </div>
        <div class="content">
            <div class="notification-card">
                <div class="message-content">
                    <br>
                    <p>Dear Admin,</p>
                    <br>
                    <p>A new student application has been added to the system by <?= $consultant_name ?>. Below are the details:</p>
                    <br>
                    <p>Student Name: <?= $student_name ?></p>
                    <p>Email: <?= $email ?></p>
                    <p>Phone: <?= $phone ?></p>
                    <p>University: <?= $university ?></p>
                    <p>Program Applied: <?= $course ?></p>
                    <br>
                    <p>You can review the application and take necessary action.</p>
                    <br>
                    <p>For any clarifications, please reach out to <?= $consultant_name ?> or reply to this email.</p>
                    <br>
                    <p>Best Regards,</p>
                    <p>UpCarrera Education Team</p>
                </div>
            </div>
        </div>
        <div class="footer">
            <p class="footer-text">© 2025 Upcarrera Education Pvt Ltd.</p>
            <div class="divider"></div>
            <p class="footer-text">This email was sent to <?= $email ?></p>
        </div>
    </div>
</body>
</html>
