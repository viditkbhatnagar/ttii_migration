<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TTII Notification</title>
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
            /* background: linear-gradient(to right, rgb(237 119 29), #0a875c, rgb(237 119 29)); */
        }
        .header {
            position: relative;
            padding: 10px;
            text-align: center;
            background: white;
        }
        .header::after {
            content: '';
            position: absolute;
            bottom: -20px;
            left: 0;
            right: 0;
            height: 40px;
            background: white;
            transform: skewY(-2deg);
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
        .tag {
            display: inline-block;
            padding: 6px 12px;
            background: rgb(237 119 29 / 28%);
            color: rgb(237 119 29);
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
        .cta-section {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            padding: 16px 40px;
            background: rgb(237 119 29);
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
        .info-grid {
            margin-top: 40px;
        }
        .info-box {
            position: relative;
            background: #f8faf9;
            padding: 25px;
            border-radius: 12px;
            flex: 1 1 calc(50% - 10px);
            margin-bottom: 10px;
        }
        .info-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgb(237 119 29);
            margin-bottom: 10px;
            font-weight: 600;
        }
        .info-content {
            font-size: 15px;
            color: #4a5568;
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
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
            }
            .header, .content {
                padding: 20px;
            }
            .logo-wrapper {
                padding: 15px 30px;
            }
            .notification-card {
                padding: 20px;
            }
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
                <div class="tag">Course Update</div>
                <div class="message-content">
                    <p>Dear [Student Name],</p>
                    <br>
                    <p>Your upcoming session for [Course Name] has been scheduled for [Date] at [Time].</p>
                    <br>
                    <p>Please ensure you're prepared with the required materials and login to the platform 5 minutes before the session begins.</p>
                </div>
            </div>
            
            <div class="cta-section">
                <a href="#" class="cta-button">Join Session</a>
            </div>
            
            <div class="info-grid">
                <div class="info-box">
                    <div class="info-label">Phone</div>
                    <div class="info-content">(+91) 9747 400 111</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Email</div>
                    <div class="info-content">info@ttii.com</div>
                </div>
                <div class="info-box full">
                    <div class="info-label">Address</div>
                    <div class="info-content">TTII Education Pvt Ltd.<br>2nd floor, Kannattu Building,<br>Opposite Holiday Inn Hotel,<br>Chakkaraparambu, NH 66 Ernakulam,<br>Kerala-682032</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">© 2025 TTII Education Pvt Ltd.</p>
            <div class="divider"></div>
            <p class="footer-text">This email was sent to [email@address.com]</p>
        </div>
    </div>
</body>
</html>