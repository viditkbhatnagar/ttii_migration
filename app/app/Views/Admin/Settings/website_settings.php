<?php
  $homepage_banner = themeConfiguration(get_frontend_settings('theme'), 'homepage');
?>
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
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-body">
                <form action="<?=base_url('admin/settings/website_settings/frontend_update')?>" enctype="multipart/form-data" method="post">
                        <div>
                           <div class="row">
                                   <div class="col-lg-6">
                                       <div class="mb-3">
                                           <label class="form-label" for="steparrow-gen-info-username-input">Banner Title<span class="required text-danger">*</span></label>
                                           <input type="text" name = "banner_title" id = "banner_title" class="form-control" value="<?php echo get_frontend_settings('banner_title');  ?>" required>
                                        </div>
                                    </div>
                                   <div class="col-lg-6">
                                       <div class="mb-3">
                                           <label class="form-label" for="steparrow-gen-info-username-input">Banner Sub Title<span class="required text-danger">*</span></label>
                                           <input type="text" name = "banner_sub_title" id = "banner_sub_title" class="form-control" value="<?php echo get_frontend_settings('banner_sub_title');  ?>" required>
                                        </div>
                                    </div>
                                   <div class="col-lg-12">
                                       <div class="mb-3">
                                           <label class="form-label" for="steparrow-gen-info-username-input">Cookie Note<span class="required text-danger">*</span></label>
                                           <textarea name="cookie_note" id = "cookie_note" class="form-control" rows="5"><?php echo get_frontend_settings('cookie_note'); ?></textarea>
                                        </div>
                                    </div>
                                   <div class="col-lg-6">
                                       <div class="mb-3">
                                           <label class="form-label" for="steparrow-gen-info-username-input">Cookie Policy<span class="required text-danger">*</span></label>
                                           <textarea name="cookie_policy" id = "editor1" class="form-control" rows="5"><?php echo get_frontend_settings('cookie_policy'); ?></textarea>
                                        </div>
                                    </div>
                                   <div class="col-lg-6">
                                       <div class="mb-3">
                                            <label class="form-label" for="steparrow-gen-info-username-input">About Us<span class="required text-danger">*</span></label>
                                            <textarea name="about_us" id = "editor2" class="form-control" rows="5"><?php echo get_frontend_settings('about_us'); ?></textarea>
                                        </div>
                                    </div>
                                   <div class="col-lg-6">
                                       <div class="mb-3">
                                            <label class="form-label" for="steparrow-gen-info-username-input">Terms & Condition<span class="required text-danger">*</span></label>
                                            <textarea name="terms_and_condition" id ="editor3" class="form-control" rows="5"><?php echo get_frontend_settings('terms_and_condition'); ?></textarea>
                                        </div>
                                    </div>
                                   <div class="col-lg-6">
                                       <div class="mb-3">
                                            <label class="form-label" for="steparrow-gen-info-username-input">Privacy Policy<span class="required text-danger">*</span></label>
                                            <textarea name="privacy_policy" id = "editor4" class="form-control" rows="5"><?php echo get_frontend_settings('privacy_policy'); ?></textarea>
                                        </div>
                                    </div>
                                    <div class="col-lg-12">
                                       <div class="mb-3">
                                           <label class="form-label" for="steparrow-gen-info-username-input">Cookie Status<span class="required text-danger">*</span></label>
                                           <input type="radio" value="active" name="cookie_status" <?php if(get_frontend_settings('cookie_status') == 'active') echo 'checked'; ?>>
                                            &nbsp;&nbsp;
                                            <input type="radio" value="inactive" name="cookie_status" <?php if(get_frontend_settings('cookie_status') == 'inactive') echo 'checked'; ?>>
                                        </div>
                                    </div>
                                    
                                 <div class="col-12 p-2 text-center">
                                    <button class="btn btn-success  btn-save col-4" type="submit">
                                        <i class="ri-check-fill"></i> Save
                                    </button>
                                </div>
                            </div>
                    </div>
                </form><br>
                    <div class="row justify-content-center">
                        <div class="col-xl-4 col-lg-6">
                            <div class="card">
                                <div class="card-body">
                                    <div class="col-xl-12">
                                        <h4 class="mb-3 header-title">Update Light Logo</h4>
                                        <div class="row justify-content-center">
                                            <form action="<?php echo site_url('admin/settings/website_settings/light_logo'); ?>" method="post" enctype="multipart/form-data" style="text-align: center;">
                                                <div class="form-group mb-2">
                                                    <div class="wrapper-image-preview">
                                                        <div class="box" style="width: 250px;">
                                                            <!--<div class="js--image-preview" style="background-image: url(<?= base_url(get_file($light_logo['value'])); ?>); background-color: #F5F5F5;"></div>|-->
                                                            <div class="upload-options" style="background-image: url(<?= base_url(get_file($light_logo['value'])); ?>);background-size: cover;">
                                                                <label for="light_logo" class="btn"> <i class="mdi mdi-camera"></i>  Update Light Logo<br> <small>(330 X 70)</small> </label>
                                                                <input id="light_logo" style="visibility:hidden;"  type="file" class="image-upload" name="light_logo" accept="image/*">
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button type="submit" class="btn btn-primary btn-block">Update Light Logo</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-xl-4 col-lg-6">
                        <div class="card">
                            <div class="card-body">
                                <div class="col-lg-12">
                                    <h4 class="mb-3 header-title">Update Dark Logo</h4>
                                    <div class="row justify-content-center">
                                        <form action="<?php echo site_url('admin/settings/website_settings/dark_logo'); ?>" method="post" enctype="multipart/form-data" style="text-align: center;">
                                            <div class="form-group mb-2">
                                                <div class="wrapper-image-preview">
                                                    <div class="box" style="width: 250px;">
                                                        <!--<div class="js--image-preview" style="background-image: url(<?= base_url(get_file($dark_logo['value'])); ?>); background-color: #F5F5F5;"></div>-->
                                                        <div class="upload-options" style="background-image: url(<?= base_url(get_file($dark_logo['value'])); ?>);background-size: cover;">
                                                            <label for="dark_logo" class="btn"> <i class="mdi mdi-camera"></i> Update Dark Logo<br> <small>(330 X 70)</small> </label>
                                                            <input id="dark_logo" style="visibility:hidden;" type="file" class="image-upload" name="dark_logo" accept="image/*">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" class="btn btn-primary btn-block">Update Dark Logo</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-4 col-lg-6">
                        <div class="card">
                            <div class="card-body">
                                <div class="col-lg-12">
                                    <h4 class="mb-3 header-title">Update Small Logo</h4>
                                    <div class="row justify-content-center">
                                        <form action="<?php echo site_url('admin/settings/website_settings/small_logo'); ?>" method="post" enctype="multipart/form-data" style="text-align: center;">
                                            <div class="form-group mb-2">
                                                <div class="wrapper-image-preview">
                                                    <div class="box" style="width: 250px;">
                                                        <!--<div class="js--image-preview" style="background-image: url(<?= base_url(get_file($small_logo['value'])); ?>); background-color: #F5F5F5;"></div>-->
                                                        <div class="upload-options" style="background-image: url(<?= base_url(get_file($small_logo['value'])); ?>);background-size: cover;">
                                                            <label for="small_logo" class="btn"> <i class="mdi mdi-camera"></i> Update Small Logo <br> <small>(49 X 58)</small> </label>
                                                            <input id="small_logo" style="visibility:hidden;" type="file" class="image-upload" name="small_logo" accept="image/*">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" class="btn btn-primary btn-block">Update Small Logo</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-4 col-lg-6">
                        <div class="card">
                            <div class="card-body">
                                <div class="col-lg-12">
                                    <h4 class="mb-3 header-title">Update Favicon</h4>
                                    <div class="row justify-content-center">
                                        <form action="<?php echo site_url('admin/settings/website_settings/favicon'); ?>" method="post" enctype="multipart/form-data" style="text-align: center;">
                                            <div class="form-group mb-2">
                                                <div class="wrapper-image-preview">
                                                    <div class="box" style="width: 250px;">
                                                        <div class="js--image-preview" style="background-image: url(<?= base_url(get_file($favicon['value'])); ?>); background-color: #F5F5F5;"></div>
                                                        <div class="upload-options" style="background-image: url(<?= base_url(get_file($favicon['value'])); ?>);background-size: cover;">
                                                            <label for="favicon" class="btn"> <i class="mdi mdi-camera"></i> Update Favicon <br> <small>(90 X 90)</small> </label>
                                                            <input id="favicon" style="visibility:hidden;" type="file" class="image-upload" name="favicon" accept="image/*">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" class="btn btn-primary btn-block">Update Favicon</button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div><!--end row-->
<script>
    $(document).ready(function() {
    // Initialize CKEditor
    ClassicEditor
        .create( document.querySelector( '#editor1' ) )
        .catch( error => {
            console.error( error );
        } );

    ClassicEditor
        .create( document.querySelector( '#editor2' ) )
        .catch( error => {
            console.error( error );
        } );
        
    ClassicEditor
        .create( document.querySelector( '#editor3' ) )
        .catch( error => {
            console.error( error );
        } );
    ClassicEditor
        .create( document.querySelector( '#editor4' ) )
        .catch( error => {
            console.error( error );
        } );
    ClassicEditor
        .create( document.querySelector( '#editor5' ) )
        .catch( error => {
            console.error( error );
        } );

    // Initialize other functionalities
    // ...
});
</script>





