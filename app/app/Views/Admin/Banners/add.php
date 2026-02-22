
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <!--<ol class="breadcrumb m-0">-->
                <!--    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>-->
                <!--    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>-->
                <!--</ol>-->
                <a class="btn btn-outline-dark float-end" href="<?=base_url('app/dashboard/index')?>"><i class="ri-arrow-left-circle-line"></i> Go Back</a>
            </div>

        </div>
    </div>
</div>



<form autocomplete="off" action="<?=base_url('app/app_category/add')?>" method="post" novalidate enctype="multipart/form-data">
    <div class="row">
                        <div class="col-lg-12">
                            <div class="card">
                                <div class="card-body">
                                    <div class="live-preview">
                                        <div class="row gy-4">
                                            <div class="col-xxl-3 col-md-6">
                                                <div>
                                                    <label for="code" class="form-label">Category Code<span class="required text-danger">*</span></label>
                                                    <input type="text" class="form-control" id="code" name="code" value="<?php echo substr(md5(rand(0, 1000000)), 0, 10); ?>" readonly>
                                                </div>
                                            </div>
                                            <!--end col-->
                                            <div class="col-xxl-3 col-md-6">
                                                <div>
                                                    <label for="name" class="form-label">Category Title<span class="required text-danger">*</span></label>
                                                    <input type="password" class="form-control" id="name" name="name" required>
                                                </div>
                                            </div>
                                            
                                            
                                            <div class="col-xxl-3 col-md-6">
                                                <label for="name" class="form-label">Parent <span class="required text-danger">*</span></label>
                                                <select class="form-control select2" name="parent">
                                                    <option value="0">None</option>
                                                    <?php foreach($categories as $val){ ?>
                                                            <option value="<?=$val['id']?>"><?=$val['name']?></option>
                                                    <?php } ?>
                                    
                                                </select>
                                            </div>
                                            
                                            <div class="col-xxl-3 col-md-6">
                                                <div>
                                                    <label for="font_awesome_class">Icon Picker</label>
                                                    <input type="text" id ="font_awesome_class" name="font_awesome_class" class="form-control icon-picker" autocomplete="off">
                                                </div>
                                            </div>
                                            
                                            <div class="col-xxl-3 col-md-6">
                                                <div>
                                                    <label for="category_thumbnail" class="form-label">Category thumbnail (The image size should be: 400 X 255)</label>
                                                    <input type="file" class="form-control" id="category_thumbnail" name="category_thumbnail" required>
                                                </div>
                                            </div>
                                            
                                        </div>
                                        <!--end row-->
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!--end col-->
                    </div>
</form>

