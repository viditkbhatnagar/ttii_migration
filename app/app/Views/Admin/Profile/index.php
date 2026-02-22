<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
    <form action="<?=base_url('admin/profile/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
        <div class="row mt-5">
            <div class="col-xxl-3">
                <div class="card mt-n5">
                    <div class="card-body p-4">
                        <div class="text-center m-5">
                            <div class="profile-user position-relative d-inline-block mx-auto ">
                                <?php if(valid_file($edit_data['image'])){ ?>
                                        <img src="<?=base_url(get_file($edit_data['image']))?>" id="user-profile-img" class="rounded-circle avatar-xl img-thumbnail user-profile-image" alt="user-profile-image">
                                <?php }else{ ?>
                                        <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" id="user-profile-img" class="rounded-circle avatar-xl img-thumbnail user-profile-image" alt="user-profile-image">
                                <?php } ?>
                                <div class="avatar-xs p-0 rounded-circle profile-photo-edit">
                                    <input id="profile-img-file-input" type="file" name="profile_picture" class="profile-img-file-input">
                                    <label for="profile-img-file-input" class="profile-photo-edit avatar-xs">
                                        <span class="avatar-title rounded-circle bg-light text-body">
                                            <i class="ri-camera-fill"></i>
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <h5 class="fs-16 mb-1"><?=$edit_data['name']?></h5>
                        </div>
                    </div>
                </div>
                <!--end card-->
            </div>
            <!--end col-->
            
            <div class="col-xxl-9">
                <div class="card mt-xxl-n5">
                    <div class="card-header">
                        <ul class="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active" data-bs-toggle="tab" href="#personalDetails" role="tab">
                                    <i class="fas fa-home"></i> Personal Details
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div class="card-body p-4">
                        <div class="tab-content">
                            <div class="tab-pane active" id="personalDetails" role="tabpanel">
                                <!--<form action="javascript:void(0);">-->
                                    <div class="row">
                                        <div class="col-lg-6">
                                            <div class="mb-3">
                                                <label for="name" class="form-label">Name</label>
                                                <input type="text" class="form-control" name="name" id="name" placeholder="Enter your name" value="<?=$edit_data['name']?>">
                                            </div>
                                        </div>
                                        <!--end col-->
                                        <div class="col-lg-6">
                                            <div class="mb-3">
                                                <label for="phone" class="form-label">Phone Number</label>
                                                <input type="text" class="form-control" name="phone" id="phone" placeholder="Enter your phone number" value="<?=$edit_data['phone']?>">
                                            </div>
                                        </div>
                                        <!--end col-->
                                        <div class="col-lg-6">
                                            <div class="mb-3">
                                                <label for="email" class="form-label">Email Address</label>
                                                <input type="email" class="form-control" name="email" id="email" placeholder="Enter your email" value="<?=$edit_data['email']?>">
                                            </div>
                                        </div>
                                        <!--end col-->
                                        <div class="col-lg-6">
                                            <div class="mb-3">
                                                <label for="dob" class="form-label">Date of Birth</label>
                                                <input type="date" class="form-control" name="dob" id="dob" value="<?=$edit_data['dob']?>" />
                                            </div>
                                        </div>
                                        <!--end col-->
                                        <!--end col-->
                                        <div class="col-lg-12">
                                            <div class="hstack gap-2 justify-content-end">
                                                <button type="submit" class="btn btn-primary">Update</button>
                                                <a href="<?=base_url('app/dashboard/index')?>" class="btn btn-soft-success">Cancel</a>
                                            </div>
                                        </div>
                                        <!--end col-->
                                    </div>
                                    <!--end row-->
                                <!--</form>-->
                            </div>
                            <!--end tab-pane-->
                        </div>
                    </div>
                </div>
            </div>
            <!--end col-->
        </div>
    </form>
<!--password reset-->
<form action="<?=base_url('admin/profile/reset_password/'.$edit_data['id'])?>" name="password_reset" method="post" enctype="multipart/form-data">
    <div class="row mt-5">
        <div class="col-xxl-3">
            <!--end card-->
        </div>
        <!--end col-->
        
        <div class="col-xxl-9">
            <div class="card mt-xxl-n5">
                <div class="card-header">
                    <ul class="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link active" data-bs-toggle="tab" href="#passwordReset" role="tab">
                                <i class="fas fa-home"></i> Password Reset
                            </a>
                        </li>
                    </ul>
                </div>
                <div class="card-body p-4">
                    <div class="tab-content">
                        <div class="tab-pane active" id="personalDetails" role="tabpanel">
                            <!--<form action="javascript:void(0);">-->
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="mb-3">
                                            <label for="password" class="form-label">Password</label>
                                            <div class="position-relative auth-pass-inputgroup mb-3">
                                                <input type="password" class="form-control pe-5 password-input" placeholder="Enter password" name="password" id="password-input">
                                                <button class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon" type="button" id="password-addon"><i class="ri-eye-fill align-middle"></i></button>
                                            </div>
                                        </div>
                                    </div>
                                    <!--end col-->
                                    <div class="col-lg-6">
                                        <div class="mb-3">
                                            <label for="confirm_password" class="form-label">Confirm Password</label>
                                            <div class="position-relative auth-pass-inputgroup mb-3">
                                                <input type="password" class="form-control pe-5 password-input" placeholder="Enter password" name="confirm_password" id="confirm-password-input" >
                                                <button class="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon" type="button" id="password-addon"><i class="ri-eye-fill align-middle"></i></button>
                                                <div id="password-error" class="error-message text-danger"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <!--end col-->
                                    <div class="col-lg-12">
                                        <div class="hstack gap-2 justify-content-end">
                                            <button type="submit" class="btn btn-danger">Reset Password</button>
                                            <!--<a href="<?//=base_url('app/dashboard/index')?>" class="btn btn-soft-success">Cancel</a>-->
                                        </div>
                                    </div>
                                    <!--end col-->
                                </div>
                                <!--end row-->
                            <!--</form>-->
                        </div>
                        <!--end tab-pane-->
                    </div>
                </div>
            </div>
        </div>
        <!--end col-->
    </div>
</form>
<!--end row-->

<script>
    $(function() {
        $("form[name='password_reset']").submit(function(e) {
             // prevent actual form submit
            var password = $('#password-input').val();
            var confirm_password = $('#confirm-password-input').val();
            var passwordError = document.getElementById('password-error');
    
            if (password.length < 6) {
                e.preventDefault();
                passwordError.textContent = "Password should be at least 6 characters long!";
                return false; // Prevent form submission
            } else if (password !== confirm_password) {
                e.preventDefault();
                passwordError.textContent = "Passwords do not match!";
                return false; // Prevent form submission
            } 
        });
    });
    
    $(document).ready(function () {
        $('#profile-img-file-input').change(function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    $('#user-profile-img').attr('src', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    });
</script>