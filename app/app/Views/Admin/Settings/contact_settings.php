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
                                   <label class="form-label" for="steparrow-gen-info-username-input">Contact Whatsapp<span class="required text-danger">*</span></label>
                                   <input type="text" name = "contact_whatsapp" id = "contact_whatsapp" class="form-control" value="<?php echo get_settings('contact_whatsapp');  ?>" required>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Contact Phone<span class="required text-danger">*</span></label>
                                   <input type="text" name = "contact_phone" id = "contact_phone" class="form-control" value="<?php echo get_settings('contact_phone');  ?>" required>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Contact Email<span class="required text-danger">*</span></label>
                                   <input type="text" name = "contact_email" id = "contact_email" class="form-control" value="<?php echo get_settings('contact_email');  ?>" required>
                                </div>
                            </div>
                           <div class="col-lg-6">
                               <div class="mb-3">
                                   <label class="form-label" for="steparrow-gen-info-username-input">Contact Address<span class="required text-danger">*</span></label>
                                   <input type="text" name = "contact_address" id = "contact_address" class="form-control" value="<?php echo get_settings('contact_address');  ?>" required>
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






