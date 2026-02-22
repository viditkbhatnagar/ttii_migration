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
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-body">
                <form action="" enctype="multipart/form-data" method="post">
                    <div>
                       <div class="row">
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Website Name<span class="required text-danger">*</span></label>
                                   <input type="text" class="form-control" id="system_name" name="system_name" value="<?php echo get_settings('system_name');  ?>" required>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Website Title<span class="required text-danger">*</span></label>
                                   <input type="text" name = "system_title" id = "system_title" class="form-control" value="<?php echo get_settings('system_title');  ?>" required>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">System Email<span class="required text-danger">*</span></label>
                                   <input type="text" name = "system_email" id = "system_email" class="form-control" value="<?php echo get_settings('system_email');  ?>" required>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Website Keywords<span class="required text-danger">*</span></label>
                                   <input type="text" class="form-control bootstrap-tag-input" id = "website_keywords" name="website_keywords" data-role="tagsinput" style="width: 100%;" value="<?php echo get_settings('website_keywords');  ?>"/>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Website Description<span class="required text-danger">*</span></label>
                                   <textarea name="website_description" id = "website_description" class="form-control" rows="5"><?php echo get_settings('website_description');  ?></textarea>
                                </div>
                            </div>
                            <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Address<span class="required text-danger">*</span></label>
                                   <textarea name="address" id = "address" class="form-control" rows="5"><?php echo get_settings('address');  ?></textarea>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Author<span class="required text-danger">*</span></label>
                                   <input type="text" name = "author" id = "author" class="form-control" value="<?php echo get_settings('author');  ?>">
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Privacy Policy<span class="required text-danger">*</span></label>
                                   <input type="text" name = "privacy_policy" id = "privacy_policy" class="form-control" value="<?php echo get_settings('privacy_policy');  ?>">
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Phone<span class="required text-danger">*</span></label>
                                   <input type="text" name = "phone" id = "phone" class="form-control" value="<?php echo get_settings('phone');  ?>">
                                </div>
                            </div>
                            
                         <div class="col-12 p-2">
                            <button class="btn btn-success float-end btn-save" type="submit">
                                <i class="ri-check-fill"></i> Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div><!--end row-->






