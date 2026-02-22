<!doctype html>
<html lang="en" data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable">

<head>
    <meta charset="utf-8" />
    <title>Sign Up</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta content="Arc Foundation" name="description" />
    <meta content="Themesbrand" name="author" />
    <link rel="shortcut icon" href="assets/images/favicon.ico">

    <script src="<?=base_url()?>assets/js/layout.js"></script>
    <link href="<?=base_url()?>assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
    <link href="<?=base_url()?>assets/css/icons.min.css" rel="stylesheet" type="text/css" />
    <link href="<?=base_url()?>assets/css/app.min.css" rel="stylesheet" type="text/css" />
    <link href="<?=base_url()?>assets/css/custom.min.css" rel="stylesheet" type="text/css" />

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
            <img src="assets/arclogo.png" alt="Logo" style="width: 50px; margin-bottom: 1rem;">
        </div>
        <h5 class="text-primary">Create Your Account</h5>
        <p class="text-muted mb-4">Sign up to continue to ARC Foundation</p>

        <form action="./aa-arc-lms-otp.html">
            <label class="form-label">Sign Up</label>
            <p class="text-muted text-start">Please Enter Name and Number</p>
            <div class="mb-3">
                <input type="text" class="form-control input-hover" id="phone-input" placeholder="Enter Full name">
            </div>
            <div>
                <!-- <label class="form-label">Enter Your Mobile Number</label>
                <p class="text-muted text-start">We will send an OTP for verification</p> -->
                <div class="input-group" data-input-flag>
                    <button class="btn btn-light border" type="button" data-bs-toggle="dropdown" aria-expanded="false"><img src="assets/images/flags/in.svg" alt="flag img" height="20" class="country-flagimg rounded"><span class="ms-2 country-codeno">+ 91</span></button>
                    <input type="text" class="form-control rounded-end flag-input" value="" placeholder="Mobile number" oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');" />
                    <div class="dropdown-menu w-100">
                        <div class="p-2 px-3 pt-1 searchlist-input">
                            <input type="text" class="form-control form-control-sm border search-countryList" placeholder="Search country name or country code..." />
                        </div>
                        <ul class="list-unstyled dropdown-menu-list mb-0"></ul>
                    </div>
                </div>
            </div>
            <div class="mb-3 d-none">
                <label class="form-label" for="email-input">Phone Number</label>
                <input type="text" class="form-control input-hover" id="phone-input" placeholder="Enter phone number">
            </div>

            

            <div class="mt-4">
                <button class="btn btn-hover btn-link text-white" type="submit">Sign Up</button>
                <p class="mt-2">Already have an account? <a href="#" class="text-danger">Sign In</a></p>
            </div>
        </form>
    </div>

    <footer>
        <p class="mb-0">&copy; <small>Powered by <a href="https://trogonmedia.com">Trogon Media</a></small></p>
    </footer>

    <script src="<?=base_url()?>assets/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="<?=base_url()?>assets/libs/simplebar/simplebar.min.js"></script>
    <script src="<?=base_url()?>assets/libs/node-waves/waves.min.js"></script>
    <script src="<?=base_url()?>assets/libs/feather-icons/feather.min.js"></script>
    <script src="<?=base_url()?>assets/js/pages/plugins/lord-icon-2.1.0.js"></script>
    <script src="<?=base_url()?>assets/js/plugins.js"></script>
    <script src="<?=base_url()?>assets/js/pages/password-addon.init.js"></script>
    
    <!-- multi.js -->
    <script src="<?=base_url()?>assets/libs/multi.js/multi.min.js"></script>
    <!-- autocomplete js -->
    <script src="<?=base_url()?>assets/libs/@tarekraafat/autocomplete.js/autoComplete.min.js"></script>

    <!-- init js -->
    <script src="<?=base_url()?>assets/js/pages/form-advanced.init.js"></script>
    <!-- input spin init -->
    <script src="<?=base_url()?>assets/js/pages/form-input-spin.init.js"></script>
    <!-- input flag init -->
    <script src="<?=base_url()?>assets/js/pages/flag-input.init.js"></script>

    <!-- App js -->
    <script src="<?=base_url()?>assets/js/app.js"></script>

</body>

</html>
