<!doctype html>
<html lang="en" data-layout="vertical" data-topbar="light" data-sidebar="dark" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable">

<head>

    <meta charset="utf-8" />
    <title>Login - <?=get_site_title()?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta content="<?=get_site_title()?>" name="description" />
    <meta content="<?=get_site_title()?>" name="author" />
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

    <style>
        .mybgimage {
            background-image: url("https://images.pexels.com/photos/5212700/pexels-photo-5212700.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1");
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;
        }
        .btn-hover {
            transition: all 0.3s ease;
        }

        .btn-hover:hover {
            background-color: #eb4f87 !important;
            transform: translateY(-2px);
            transition: all 0.3s ease;
        }

        .input-hover {
            transition: all 0.3s ease;
        }

        .input-hover:hover {
            border-color: #8f2774;
            box-shadow: 0 0 5px rgba(89, 48, 176, 0.5);
        }
        .bg-overlay {
            background-color: #431b8b;
            opacity: 0.5;
        }

    </style>

</head>

<body>

<div class="auth-page-wrapper py-5 d-flex justify-content-center align-items-center min-vh-100" style="background:linear-gradient(to right, #8f2774, #f53b90)">
    <!-- auth-page content -->
    <div class="auth-page-content overflow-hidden pt-lg-5">
        <div class="container">
            <div class="row d-flex justify-content-center ">
                <div class="col-lg-11">
                    <div class="card overflow-hidden rounded-5">
                        <div class="row g-0 ">
                            <div class="col-lg-6">
                                <div class="p-lg-5 p-4 mybgimage h-100">
                                    <div class="bg-overlay"></div>
                                    <div class="position-relative h-100 d-flex flex-column">
                                        <div class="mb-4">
                                            <!-- Additional content if needed -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- end col -->

                            <div class="col-lg-6">
                                <div class="p-lg-5 p-4">
                                    <div class="text-center">
                                        <div>
                                            <a href="<?=base_url('login/index')?>" class="d-inline-block auth-logo">
                                                <img src="<?=base_url()?>assets/app/images/TTII-logo-land.png" alt="" height="50" style="padding: 0.5em;">
                                            </a>
                                        </div>
                                        <h5 class="text-primary pt-3">Forgot Password?</h5>
                                        <p class="text-muted">Enter your email to receive a password reset link.</p>
                                        <div class="p-1">
                                            <?php
                                            if (!empty($error)){
                                                alert_danger_dismiss($error);
                                            }
                                             if (session()->getFlashdata('message_danger') !== NULL)
                                             {
                                                 alert_danger_dismiss(session()->getFlashdata('message_danger'));
                                             }
                                             if(session()->getFlashdata('message_success') !== NULL){
                                                 alert_success_dismiss(session()->getFlashdata('message_success'));
                                             }
                                            ?>
                                        </div>
                                    </div>
                                    <div class="mt-4">
                                        <form action="" method="post" name="forgot_password">
                                            <div class="mb-3">
                                                <label for="email" class="form-label">Email</label>
                                                <input type="email" class="form-control input-hover" id="email" name="email" placeholder="Enter your email" required>
                                            </div>
                                            <div class="mt-4">
                                                <button class="btn text-white w-100 btn-hover" type="submit" style="background-color: #8f2774;">Send Reset Link</button>
                                            </div>
                                        </form>
                                    </div>

                                    <div class="mt-4 text-center d-none">
                                        <p class="mb-0">Don't have an account? <a href="auth-signup-basic.html" class="fw-semibold text-primary text-decoration-underline"> Signup </a> </p>
                                    </div>
                                </div>
                            </div>
                            <!-- end col -->
                        </div>
                        <!-- end row -->
                    </div>
                    <!-- end card -->
                </div>
                <!-- end col -->

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
                        <p class="mb-0 text-light">&copy; <?=date('Y')?> <strong><?=get_site_title()?></strong> | <small>Powered by <a class="text-light" href="https://trogonmedia.com">Trogon Media</a></small></p>
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
<script src="<?=base_url()?>assets/app/js/pages/password-addon.init.js"></script>
<script>
    /* home page */

    /* color transitions */
    var colors = [
        [106, 17, 203],
        [37, 117, 252],
        [255, 38, 112],
        [127, 0, 255],
        [225, 0, 255]
    ];

    var step = 0;
    var colorIndices = [0, 1, 2, 3];
    var gradientSpeed = 0.002;

    function updateGradient() {
        var c0_0 = colors[colorIndices[0]];
        var c0_1 = colors[colorIndices[1]];
        var c1_0 = colors[colorIndices[2]];
        var c1_1 = colors[colorIndices[3]];

        var istep = 1 - step;
        var r1 = Math.round(istep * c0_0[0] + step * c0_1[0]);
        var g1 = Math.round(istep * c0_0[1] + step * c0_1[1]);
        var b1 = Math.round(istep * c0_0[2] + step * c0_1[2]);
        var color1 = "#" + ((r1 << 16) | (g1 << 8) | b1).toString(16).padStart(6, '0');

        var r2 = Math.round(istep * c1_0[0] + step * c1_1[0]);
        var g2 = Math.round(istep * c1_0[1] + step * c1_1[1]);
        var b2 = Math.round(istep * c1_0[2] + step * c1_1[2]);
        var color2 = "#" + ((r2 << 16) | (g2 << 8) | b2).toString(16).padStart(6, '0');

        document.getElementById('gradient').style.background = "linear-gradient(to right, " + color1 + ", " + color2 + ")";

        step += gradientSpeed;
        if (step >= 1) {
            step %= 1;
            colorIndices[0] = colorIndices[1];
            colorIndices[2] = colorIndices[3];
            colorIndices[1] = (colorIndices[1] + Math.floor(1 + Math.random() * (colors.length - 1))) % colors.length;
            colorIndices[3] = (colorIndices[3] + Math.floor(1 + Math.random() * (colors.length - 1))) % colors.length;
        }
    }

    setInterval(updateGradient, 10);

</script>
</body>

</html>
