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
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    
                    
                </div>
            </div>
            
            <div class="card-body">
                <form action="<?=base_url('admin/settings/edit_app_version')?>" enctype="multipart/form-data" method="post">
                    <div>
                       <div class="row">
                           <div class="col-lg-8">
                               <div class="mb-3">
                                   <label class="form-label" for="app_version">Android Version<span class="required text-danger">*</span></label>
                                   <input type="text" class="form-control" id="app_version" name="app_version"  required value="<?=$edit_data['app_version'] ?? ''?>">
                                </div>
                            </div>
                            <div class="col-lg-8">
                               <div class="mb-3">
                                   <label class="form-label" for="app_version_ios">Ios Version<span class="required text-danger">*</span></label>
                                   <input type="text" class="form-control" id="app_version_ios" name="app_version_ios"  required value="<?=$edit_data['app_version_ios'] ?? ''?>">
                                </div>
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






