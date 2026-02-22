<!doctype html>
<html lang="en" data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable">

<head>

    <meta charset="utf-8" />
    <title>Login - <?=get_site_title()?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta content="" name="description" />
    <meta content="Trogon" name="author" />
    <!-- App favicon -->
    <link rel="shortcut icon" href="<?=get_image_url(20)?>">

    <!-- Layout config Js -->
    <script src="<?=base_url()?>assets/app/js/layout.js"></script>
    <!-- Bootstrap Css -->
    <link href="<?=base_url()?>assets/app/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
    <!-- Icons Css -->
    <link href="<?=base_url()?>assets/app/css/icons.min.css" rel="stylesheet" type="text/css" />
    <!-- App Css-->
    <link href="<?=base_url()?>assets/app/css/app.min.css" rel="stylesheet" type="text/css" />
    <!-- custom Css-->
    <link href="<?=base_url()?>assets/app/css/custom.min.css" rel="stylesheet" type="text/css" />

</head>

<body>

<div class="auth-page-wrapper pt-5">
    <!-- auth page bg -->
    <div class="auth-one-bg-position auth-one-bg" id="auth-particles">
        <div class="bg-overlay"></div>

        <div class="shape">
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1440 120">
                <path d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path>
            </svg>
        </div>
    </div>

    <!-- auth page content -->
    <div class="auth-page-content">
        <div class="container">
            <div class="row">
                <div class="col-lg-12">
                    <div class="text-center mt-sm-5 mb-4 text-white-50">
                        <div>
                            <a href="<?=base_url('login/index')?>" class="d-inline-block auth-logo">
                                <img src="<?=base_url(get_site_logo())?>" alt="" height="55" style="filter: brightness(0) invert(1);">
                            </a>
                        </div>
                        <p class="mt-3 fs-15 fw-medium"><?=get_site_title()?></p>
                    </div>
                </div>
            </div>
            <!-- end row -->

            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6 col-xl-5">
                    <div class="card mt-4">

                        <div class="card-body p-4">
                            <div class="text-center mt-2">
                                <h5 class="text-primary">Welcome Back !</h5>
                                <p class="text-muted">Login in to continue to <?=get_site_title()?></p>
                                <div class="p-1">
                                    <?php
                                    if (!empty($error)){
                                        alert_danger_dismiss($error);
                                    }
                                     if (session()->getFlashdata('message_danger') !== NULL)
                                     {
                                         alert_danger_dismiss(session()->getFlashdata('message_danger'));
                                     }
                                    ?>
                                </div>
                            </div>
                            <div class="p-2 mt-4">
                                <form action="" method="post" name="login">

                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email </label>
                                        <input type="email" class="form-control" id="email" name="email" placeholder="Enter email">
                                    </div>

                                    <div class="mb-3">
                                        <div class="float-end d-none">
                                            <a href="#" class="text-muted">Forgot password?</a>
                                        </div>
                                        <label class="form-label" for="password-input">Password</label>
                                        <div class="position-relative auth-pass-inputgroup mb-3">
                                            <input type="password" class="form-control pe-5 password-input" placeholder="Enter password" name="password" id="password-input">
                                            <button class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon" type="button" id="password-addon"><i class="ri-eye-fill align-middle"></i></button>
                                        </div>
                                    </div>

                                    <div class="mt-4">
                                        <button class="btn btn-success w-100" type="submit">Log In</button>
                                    </div>
                                    <div class="float-end mt-4">
                                            <a href="https://project.trogon.info/knowlid/login/contact" class="text-muted">Contact Us</a>
                                        </div>
                                    
                                    <div class="mt-4">
                                           <?=$google_button?>
                                    </div>

                                </form>
                            </div>
                        </div>
                        <!-- end card body -->
                    </div>
                    <!-- end card -->

                    <div class="mt-4 text-center d-none">
                        <p class="mb-0">Don't have an account ? <a href="auth-signup-basic.html" class="fw-semibold text-primary text-decoration-underline"> Signup </a> </p>
                    </div>

                </div>
            </div>
            <!-- end row -->
        </div>
        <!-- end container -->
    </div>
    <!-- end auth page content -->

    <!-- footer -->
    <footer class="footer">
        <div class="container">
            <div class="row">
                <div class="col-lg-12">
                    <div class="text-center">
                        <p class="mb-0 text-muted">&copy;
                            <?=date('Y')?> <strong><?=get_site_title()?></strong> |
                            <small>Powered by <a href="https://trogonmedia.com">Trogon Media</a></small>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </footer>
    <!-- end Footer -->
</div>
<!-- end auth-page-wrapper -->

<!-- JAVASCRIPT -->
<script src="<?=base_url()?>assets/app/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/simplebar/simplebar.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/node-waves/waves.min.js"></script>
<script src="<?=base_url()?>assets/app/libs/feather-icons/feather.min.js"></script>
<script src="<?=base_url()?>assets/app/js/pages/plugins/lord-icon-2.1.0.js"></script>
<script src="<?=base_url()?>assets/app/js/plugins.js"></script>

<!-- particles js -->
<script src="<?=base_url()?>assets/app/libs/particles.js/particles.js"></script>
<!-- particles app js -->
<script src="<?=base_url()?>assets/app/js/pages/particles.app.js"></script>
<!-- password-addon init -->
<script src="<?=base_url()?>assets/app/js/pages/password-addon.init.js"></script>
</body>

</html>