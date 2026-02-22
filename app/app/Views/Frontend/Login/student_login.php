<!doctype html>
<html lang="en" data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable">

<head>
    <meta charset="utf-8" />
    <title>Sign In - <?=get_site_title()?></title>
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
    <div class="auth-card rounded-4">
        <div>
            <img src="<?=base_url()?>assets/app/images/TTII-logo-land.png" alt="" height="50" style="padding: 0.5em;">
        </div>
        <h5 class="text-primary pt-3">Welcome Back!</h5>
        <p class="text-muted mb-4">Login to continue to <?=get_site_title()?></p>

        <form action="" method="post" onsubmit="return validatePhoneNumber();">
            <div class="mb-3">
                <label class="form-label">Enter Your Mobile Number</label>
                <!--<p class="text-muted text-start">We will send an OTP for verification</p>-->
                <div class="input-group" data-input-flag>
                    <button class="btn btn-light border" type="button" name="country_code" data-bs-toggle="dropdown" aria-expanded="false">
                        <img src="<?=base_url()?>assets/user/images/flags/in.svg" alt="flag img" height="20" class="country-flagimg rounded">
                        <span class="ms-2 country-codeno">+ 91</span>
                    </button>
                    <input type="hidden" name="country_code" value="91">
                    <input type="text" class="form-control rounded-end flag-input" id="phone" name="phone" placeholder="Mobile number" 
                        oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/(\..*?)\..*/g, '$1'); checkPhoneLength();" />
                    <div class="dropdown-menu w-100">
                        <div class="p-2 px-3 pt-1 searchlist-input">
                            <input type="text" class="form-control form-control-sm border search-countryList" placeholder="Search country name or country code..." />
                        </div>
                        <ul class="list-unstyled dropdown-menu-list mb-0"></ul>
                    </div>
                </div>
            </div>
            <div class="mb-3">
                <div class="float-end">
                <a href="<?=base_url('login/forgot_password')?>" class="text-muted">Forgot password?</a>
                </div>
                <label class="form-label" for="password-input">Password</label>
                <div class="position-relative auth-pass-inputgroup mb-3">
                    <input type="password" class="form-control pe-5 password-input input-hover" placeholder="Enter password" name="password" id="password-input">
                    <!--<button class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon" type="button" id="password-addon"><i class="ri-eye-fill align-middle"></i></button>-->
                </div>
            </div>
            <div class="mt-4">
                <button type="submit" id="signInButton" class="btn btn-hover btn-link text-white mb-2" disabled>Sign In</button>
                <!--<p class="mt-2">Don't have an account? <a href="<?=base_url()?>" class="text-danger">Sign Up</a> -->
                <!--<br> or-->
                <a href="<?= base_url('login/admin_login')?>" class="text-danger">Login with Email</a></p>
            </div>
        </form>


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
    <script>
    function checkPhoneLength() {
        var phoneInput = document.getElementById('phone').value;
        var signInButton = document.getElementById('signInButton');

        // Enable the button only if the phone number has exactly 10 digits
        if (phoneInput.length === 10) {
            signInButton.disabled = false;
        } else {
            signInButton.disabled = true;
        }
    }

    function validatePhoneNumber() {
        var phoneInput = document.getElementById('phone').value;
        if (phoneInput.length !== 10) {
            alert("Please enter a valid 10-digit mobile number.");
            return false;
        }
        console.log('validation done');
        return true;
    }
</script>
   

    <!-- multi.js -->
    <script src="<?=base_url()?>assets/user/libs/multi.js/multi.min.js"></script>
    <!-- autocomplete js -->
    <script src="<?=base_url()?>assets/user/libs/@tarekraafat/autocomplete.js/autoComplete.min.js"></script>

    <!-- init js -->
    <script src="<?=base_url()?>assets/user/js/pages/form-advanced.init.js"></script>
    <!-- input spin init -->
    <script src="<?=base_url()?>assets/user/js/pages/form-input-spin.init.js"></script>
    <!-- input flag init -->
    <!--<script src="<?//=base_url()?>assets/user/js/pages/flag-input.init.js"></script>-->
    <?php include('flag-input.php')?>
    <!-- App js -->
    <script src="<?=base_url()?>assets/user/js/app.js"></script>

</body>

</html>
