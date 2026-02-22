<!doctype html>
<html lang="en" data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable">

<head>
    <meta charset="utf-8" />
    <title>OTP Verification - <?=get_site_title()?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta content="<?=get_site_title()?>" name="description" />
    <meta content="<?=get_site_title()?>" name="author" />
    <link rel="shortcut icon" href="<?=get_image_url(20)?>">

    <script src="<?=base_url()?>assets/user/js/layout.js"></script>
    <link href="<?=base_url()?>assets/user/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
    <link href="<?=base_url()?>assets/user/css/icons.min.css" rel="stylesheet" type="text/css" />
    <link href="<?=base_url()?>assets/user/css/app.min.css" rel="stylesheet" type="text/css" />
    <link href="<?=base_url()?>assets/user/css/custom.min.css" rel="stylesheet" type="text/css" />

    <style>
        body {
            background-image: url(https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg);
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }

        .auth-card {
            background: rgb(255, 255, 255);
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
            position: relative;
            z-index: 20;
        }

        .auth-card .btn-hover {
            background-color: #ff0016;
            color: #fff;
            transition: all 0.3s ease;
        }

        .auth-card .btn-hover:hover {
            background-color: #a90210 !important;
            transform: translateY(-2px);
            transition: all 0.3s ease;
        }

        .auth-card .input-hover {
            transition: all 0.3s ease;
        }

        .auth-card .input-hover:hover {
            border-color: #ff0016;
            box-shadow: 0 0 5px #ff0015a6;
        }

        .auth-card .form-label {
            text-align: left;
            display: block;
            font-weight: bold;
        }

        .auth-card .link-hover {
            color: #ff0016;
            transition: color 0.3s ease;
        }

        .auth-card .link-hover:hover {
            color: #a90210;
        }

        .auth-card .btn-link {
            display: block;
            width: 100%;
            text-align: center;
            padding: 0.5rem 0;
            font-size: 1rem;
            border-radius: 5px;
            margin-top: 0.5rem;
        }

        .auth-card .btn-link-signup {
            border: 1px solid #ff0016;
            color: #ff0016;
            background-color: transparent;
            transition: all 0.3s ease;
        }

        .auth-card .btn-link-signup:hover {
            background-color: #ff0016;
            color: #fff;
            transition: all 0.3s ease;
        }

        footer {
            position: absolute;
            bottom: 10px;
            width: 100%;
            text-align: center;
            color: #fff;
        }

        footer a {
            color: #fff;
        }
    </style>
</head>

<body>
    <div class="bg-overlay"></div>
    <div class="auth-card">
        <div>
            <img src="<?=get_image_url(17)?>" alt="Logo" style="width: 50px; margin-bottom: 1rem;">
        </div>
        <h5 class="text-primary">OTP Verification</h5>
        <p class="text-muted mb-4">Enter the OTP sent to your phone</p>

        <form action="" method="post">
            <div class="mb-3">
                <label for="otp" class="form-label">OTP</label>
                <input type="text" class="form-control input-hover" id="otp" name="otp" placeholder="Enter OTP">
            </div>

            <div class="mt-4">
                <button class="btn btn-hover btn-link text-white" type="submit">Verify</button>
            </div>
        </form>
    </div>

    <footer>
        <p class="mb-0">&copy; <small>Powered by <a href="https://trogonmedia.com">Trogon Media</a></small></p>
    </footer>

    <script src="<?=base_url()?>assets/user/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="<?=base_url()?>assets/user/libs/simplebar/simplebar.min.js"></script>
    <script src="<?=base_url()?>assets/user/libs/node-waves/waves.min.js"></script>
    <script src="<?=base_url()?>assets/user/libs/feather-icons/feather.min.js"></script>
    <script src="<?=base_url()?>assets/user/js/pages/plugins/lord-icon-2.1.0.js"></script>
    <script src="<?=base_url()?>assets/user/js/plugins.js"></script>
    <script src="<?=base_url()?>assets/user/js/pages/password-addon.init.js"></script>
</body>

</html>
