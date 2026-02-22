
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Login – Teachers' Training Institute of India</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
        body {
            background: #f4f6fb;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .login-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            /* padding: 20px; */
        }

        .login-card {
            width: 100%;
            min-height: 100vh;
            border-radius: 0;
        }


        /* LEFT PANEL */
        .login-left {
            background: linear-gradient(135deg, #00328a 20%, #e75d00 100%);
            color: #fff;
            padding: 60px 50px;
            position: relative;
            border-radius: 0 20px 20px 0;
        }

        .login-left h1 {
            font-size: 5em;
            font-weight: 600;
            line-height: 1.15;
            margin-top: 40px;
        }

        .login-left p.quote {
            font-size: 18px;
            opacity: 0.9;
            margin-top: auto;
            max-width: 420px;
        }

        .login-left p.credits {
            font-size: 12px;
            opacity: 0.75;
            margin-bottom: 0px;
            align-self: flex-end;
            max-width: 420px;
        }

        .login-left small {
            opacity: 0.75;
        }

        /* Decorative stars */
        .star {
            position: absolute;
            opacity: 0.15;
        }

        .star.one { bottom: 120px; left: 60px; font-size: 40px; }
        .star.two { bottom: 200px; right: 80px; font-size: 60px; }
        .star.three { bottom: 80px; right: 180px; font-size: 28px; }

        /* RIGHT PANEL */
        .login-right {
            padding: 0px 80px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }


        @media (min-width : 1500px) {
            .login-right {
                padding: 0px 200px;
            }
        }

        .login-right h2 {
            font-size: 3.2em;
            font-weight: 800;
            margin-bottom: 6px;
            text-align: center;
        }

        .login-right p.sub {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 35px;
            text-align: center;
        }

        .form-control {
            height: 48px;
            border-radius: 10px;
            font-size: 14px;
        }

        .btn-login {
            height: 50px;
            border-radius: 30px;
            background: linear-gradient(90deg, #2f7cf6, #5fa2ff);
            border: none;
            font-weight: 600;
            box-shadow: 0 8px 20px rgba(47,124,246,0.35);
        }

        .btn-login:hover {
            transform: translateY(-1px);
        }

        .support {
            font-size: 13px;
            color: #6b7280;
            margin-top: 25px;
        }

        @media (max-width: 991px) {
            .login-left { display: none; }
            .login-right { padding: 40px 30px; }
        }


        .btn-hover {
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease;
        }

        /* Light reflection */
        .btn-hover::before {
            content: "";
            position: absolute;
            top: 0;
            left: -75%;
            width: 50%;
            height: 100%;
            background: linear-gradient(
                120deg,
                transparent,
                rgba(255, 255, 255, 0.15),
                transparent
            );
            transform: skewX(-20deg);
        }

        /* Hover animation */
        .btn-hover:hover::before {
            animation: light-sweep 1.0s ease-in-out;
        }

        .btn-hover:hover {
            transform: translateY(-2px);
        }

        /* Keyframes */
        @keyframes light-sweep {
            from {
                left: -75%;
            }
            to {
                left: 125%;
            }
        }


        #password-addon:hover {
            color: #2f7cf6;
        }



        @media (max-width: 768px) {

            /* Hide branding panel */
            .login-left {
                display: none !important;
            }

            /* Make right panel full width */
            .login-right {
                width: 100%;
                padding: 30px 20px;
                margin: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            /* Remove card constraints */
            .login-card {
                min-height: 100vh;
                border-radius: 0;
                box-shadow: none;
            }

        }


    </style>
</head>
<body>

<div class="login-wrapper">
    <div class="login-card row g-0">

        <!-- LEFT -->
        <div class="col-lg-6 login-left d-flex flex-column">
            <div class="col-sm-3">
            <img src="https://lms.teachersindia.in/uploads/logo-white.png" alt="TTII" height="auto" width="100%" style="padding: 0.5em;">
            </div>
            <h1>Become a<br>Future‑Ready<br>Teacher Today.</h1>

            <div class="star one">✦</div>
            <div class="star two">✦</div>
            <div class="star three">✦</div>

            <p class="quote mt-auto">
                “The true teacher does not bid you enter the house of wisdom,
                but rather leads you to the threshold of your own mind.”<br>
                <small>— Dr. Sarvepalli Radhakrishnan</small>
            </p>

            <p class="credits">
                <small>
                    © 2023 Teachers' Training Institute of India. All rights reserved.
                </small>
            </p>
        </div>

        <!-- RIGHT -->
        <div class="col-lg-6 login-right">
            <h2>Welcome</h2>
            <p class="sub">Enter your LMS credentials to continue.</p>

            <form action="" method="post" name="login">

            <!-- EMAIL -->
            <div class="mb-3">
                <label class="form-label" for="email">Email Address</label>
                <input
                    type="email"
                    class="form-control"
                    id="email"
                    name="email"
                    placeholder="Enter your mail"
                    required
                >
            </div>

            <div class="mb-2 position-relative">
                <label class="form-label" for="password-input">Password</label>

                <input
                    type="password"
                    class="form-control pe-5"
                    id="password-input"
                    name="password"
                    placeholder="Enter your password"
                    required
                >

                <button
                    type="button"
                    class="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted mt-3"
                    id="password-addon"
                    style="text-decoration:none;"
                    tabindex="-1"
                >
                    <i class="bi bi-eye"></i>
                </button>
            </div>

            <div class="mb-2 position-relative">
                <label class="form-label" for="role_id">Role</label>
                <select name="role_id" id="role_id" class="form-select">
                    <option value="1">Super Admin</option>
                    <option value="2">Student</option>
                    <option value="3">Instructor</option>
                    <option value="9">Counsellor</option>
                    <option value="10">Associate</option>
                    <option value="7">Centre</option>
                    <option value="8">Sub Admin</option>
                </select>
            </div>


            <!-- REMEMBER + FORGOT -->
            <div class="d-flex justify-content-between align-items-center mb-4 mt-2">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="remember" name="remember">
                    <label class="form-check-label" for="remember">Remember me</label>
                </div>

                <a href="<?= base_url('login/forgot_password') ?>" class="text-decoration-none small">
                    Forgot password?
                </a>
            </div>

            <!-- FLASH MESSAGES -->
            <div class="p-1">
                <?php
                if (!empty($error)) {
                    alert_danger_dismiss($error);
                } elseif (!empty($success)) {
                    alert_success_dismiss($success);
                }

                if (session()->getFlashdata('message_danger')) {
                    alert_danger_dismiss(session()->getFlashdata('message_danger'));
                } elseif (session()->getFlashdata('message_success')) {
                    alert_success_dismiss(session()->getFlashdata('message_success'));
                }
                ?>
            </div>

            <!-- SUBMIT -->
            <button type="submit" class="btn btn-login text-white w-100 btn-hover">
                Sign In
            </button>

        </form>


            <div class="support text-center">
                Need help?<br>
                <strong>Contact Support</strong><br>
                support@teachersindia.in
            </div>
        </div>

    </div>
</div>
<script>
    const togglePassword = document.getElementById('password-addon');
    const passwordInput = document.getElementById('password-input');
    const icon = togglePassword.querySelector('i');

    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });
</script>


</body>
</html>

