<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<!-- start page title -->
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-6">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <div class="col-6">
                        <!--<button class="btn btn-md btn-primary rounded-pill float-end"-->
                        <!--        onclick="show_ajax_modal('<?=base_url('admin/course/ajax_add/')?>', 'Add Course')">-->
                        <!--    <i class="mdi mdi-plus"></i>-->
                        <!--    Create <?=$page_title ?? ''?>-->
                        <!--</button>-->
                         <a class="btn btn-md btn-primary float-end" href="<?=base_url('admin/course/add/')?>">
                            <i class="mdi mdi-plus"></i>
                            Create <?=$page_title ?? ''?>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>


<div class="row">
    <div class="col-md-6 col-sm-6 col-lg-6 col-xl-3">
        <div class="dashboardminicard card">
            <a href="#">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm flex-shrink-0">
                            <span class="avatar-title bg-light text-success rounded-circle fs-3">
                                <i class="mdi mdi-radioactive text-success"></i>
                            </span>
                        </div>
                        <div class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center">
                            <h4 class="mb-0 fs-6">Active Course</h4>
                            <span class="badge text-success fs-4"><?=$total_active?></span>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    </div>

    <div class="col-md-6 col-sm-6 col-lg-6 col-xl-3">
        <div class="dashboardminicard card">
            <a href="#"  onclick="show_ajax_modal('<?=base_url('admin/course/ajax_pending_list/')?>', 'Pending List')">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm flex-shrink-0">
                            <span class="avatar-title bg-light text-info rounded-circle fs-3">
                                <i class="mdi mdi-radioactive-off text-info"></i>
                            </span>
                        </div>
                        <div class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center">
                            <h4 class="mb-0 fs-6">Pending Course</h4>
                            <span class="badge text-info fs-4"><?=$total_pending?></span>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    </div>

    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-3">
        <div class="dashboardminicard card">
            <a href="#">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm flex-shrink-0">
                            <span class="avatar-title bg-light text-danger rounded-circle fs-3">
                                <i class="mdi mdi-cash text-danger"></i>
                            </span>
                        </div>
                        <div class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center">
                            <h4 class="mb-0 fs-6">Free Courses</h4>
                            <span class="badge text-danger fs-4"><?=$total_free?></span>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    </div>

    <div class="col-md-6 col-sm-6 col-lg-6 col-xl-3">
        <div class="dashboardminicard card">
            <a href="#">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm flex-shrink-0">
                            <span class="avatar-title bg-light text-info rounded-circle fs-3">
                                <i class="mdi mdi-cash text-info"></i>
                            </span>
                        </div>
                        <div class="flex-grow-1 ms-3 d-flex justify-content-between align-items-center">
                            <h4 class="mb-0 fs-6">Paid Courses</h4>
                            <span class="badge text-info fs-4"><?=$total_paid?></span>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    </div>
</div>

            
<div class="row">
    <div class="col-lg-12">
        <div class="card rounded-4">
            
            <div class=" card-body">
                
                <div>
                   
                   <form method="get" action="" >
                      <div class="row g-3  ">
                        <!-- Search Bar -->
                        <div class="col  p-3">
                          <div class="input-group rounded-pill  w-75 bg-light p-2">
                            <input
                              type="text"
                              class="form-control rounded-pill d-inline-block me-2"
                              placeholder="Search..."
                              autocomplete="off"
                              id="search-options"
                              name="search"
                              value="<?= isset($_GET['search']) ? htmlspecialchars($_GET['search']) : '' ?>"
                            />
                            <span class="input-group-text bg-primary border-0 rounded-pill">
                              <i class="mdi mdi-magnify text-white"></i>
                            </span>
                          </div>
                        </div>
                    
                        
                      </div>
                    
                        <div class="row g-3">
                           


                            <div class="col-xxl-2 col-lg-3 col-md-4 col-sm-6">
                                <label for="price" class="form-label">Price</label>
                                    <select class="form-control select2" name="price" id="price">
                                       <option value="all"  <?= !isset($_GET['price']) || $_GET['price'] == 'all' ? 'selected' : '' ?>>All</option>
                                       <option value="free"  <?= isset($_GET['price']) && $_GET['price'] == 'free' ? 'selected' : '' ?> >Free</option>
                                       <option value="paid" <?= isset($_GET['price']) && $_GET['price'] == 'paid' ? 'selected' : '' ?> >Paid</option>
                                            
                                            
                                    </select>                               
                                </div>
                            <!--end col-->
                            
                             <div class="col-xxl-2 col-lg-3 col-md-4 col-sm-6">
                                <label for="status" class="form-label ">Status</label>
                                    <select class="form-control  select2 " name="status" id="status">
                                       <option value="all" <?= !isset($_GET['status']) || $_GET['status'] == 'all' ? 'selected' : '' ?> >All</option>
                                       <option value="active" <?= isset($_GET['status']) && $_GET['status'] == 'active' ? 'selected' : '' ?>>Active</option>
                                       <option value="pending" <?= isset($_GET['status']) && $_GET['status'] == 'pending' ? 'selected' : '' ?> >Pending</option>
                                            
                                            
                                    </select>                               
                                </div>
                            <!--end col-->
                            

                            <!--<div class="col-xxl-1 col-sm-2">-->
                            <!--    <button type="submit" class="btn btn-primary w-100 mt-4">-->
                            <!--        <i class="ri-equalizer-fill me-1 align-bottom"></i> Filters-->
                            <!--    </button>-->
                            <!--</div>-->
                            
                            <!--<div class="col-xxl-1 col-sm-2">-->
                            <!--    <a type="reset" class="btn btn-primary w-100 mt-4" href="<?=base_url('admin/course/index/')?>">-->
                            <!--        <i class="ri-restart-line me-1 align-bottom"></i> Reset-->
                            <!--    </a>-->
                            <!--</div>-->
                            <div class="col-xxl-2 col-lg-3 col-md-4 col-sm-6 d-flex justify-content-center" style=" align-items: end;">
                              <button type="submit" class="btn btn-secondary rounded-pill me-2 ">
                                <i class="ri-equalizer-fill me-1 align-bottom"></i> Filters
                              </button>
                              <a href="<?=base_url('admin/course/index/')?>" class="btn btn-outline-danger rounded-pill">
                                <i class="ri-restart-line me-1 align-bottom "></i> Reset
                              </a>
                            </div>
                            <!--end col-->
                        </div>
                        <!--end row-->
                    </form>
                </div><!-- end row -->
                
                
            </div>
           
           

            
            
        </div>
    </div>
</div><!--end row-->
<!--</?php-->
    <!--// Get the current URL-->
<!--    $current_url = current_url() . '?' . $_SERVER['QUERY_STRING'];-->
    
    <!--// Check if the URL contains 'button=true'-->
<!--    if (strpos($current_url, 'button=true') !== false){ ?>-->
        <div class=" card">
        <div class=" card-body">
            <div>
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%;">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Title</th>
                        <!--<th>Category</th>-->
                        <th>Lessons</th>
                        <th>Enrolled Students</th>
                        <th>Status</th>
                        <!--<th>Price</th>-->
                        <!--</?php if (get_settings('batch') == 'on') : ?>-->
                        <!--<th>Batch</th>-->
                        <!--</?php endif; ?>-->
                        <th style="width: 120px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><b><a href="<?=base_url('admin/course/details/'.$list_item['id'])?>" class="link-primary link-offset-2 text-decoration-underline link-underline-opacity-25 link-underline-opacity-100-hover"><?=strtoupper($list_item['title'])?></a></b></td>
                                    <//td><//?=$category[$list_item['category_id']]?><///td>
                                    <td>
                                        <!--<small class="text-muted"></?php echo '<b>Toal Section</b>: '.$list_item['section'] ?? 0; ?></small><br>-->
                                            <?= $list_item['lesson'] ?? 0; ?>
                                    </td>
                                    <td>
                                        <!--<a href="</?=base_url('admin/course/enrolled_students/'.$list_item['id'])?>" class="link-primary link-offset-2 text-decoration-underline link-underline-opacity-25 link-underline-opacity-100-hover"  >-->
                                            <?=$list_item['enrolled'] ?? ''?>
                                        <!--</a>-->
                                    </td>
                                    <?php
                                    $badgestyle = ($list_item['status'] == 'active') ? 'bg-success' : 'bg-warning';
                                    ?>
                                    <td><span class="badge <?= $badgestyle ?>"><?= ucfirst($list_item['status']) ?></span></td>
                                    <!--<td ><//?=number_format($list_item['price'],2)?></td>-->
                                    
                                    <!--</?php if (get_settings('batch') == 'on') : ?>-->
                                    <!--<td><a class="btn btn-md btn-primary rounded-pill" href="</?=base_url('admin/course/batch/'.$list_item['id'])?>"><i class="mdi mdi-user"></i>Batches</a></td>-->
                                    <!--</?php endif; ?>-->
        
                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <?php
                                                if ($list_item['status'] == 'active')
                                                {?>
                                                    <li>
                                                        <a class="dropdown-item edit-item-btn" href="<?=base_url('admin/course/change_status/'.$list_item['id'].'/?status=pending')?>">
                                                            <i class="ri-exchange-box-line align-bottom me-2 text-muted"></i> Mark as Pending
                                                        </a>
                                                    </li>
                                                    
                                                <?php
                                                }
                                                else
                                                {?>
                                                    <li>
                                                        <a class="dropdown-item edit-item-btn" href="<?=base_url('admin/course/change_status/'.$list_item['id'].'/?status=active')?>">
                                                            <i class="ri-exchange-box-line align-bottom me-2 text-muted"></i> Mark as Active
                                                        </a>
                                                    </li>
                                                   
                                                <?php 
                                                }
                                                ?>
                                            
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/course/ajax_edit/'.$list_item['id'])?>', 'Update Course')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/course/delete/'.$list_item['id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                                <?php
                            }
                        }
                    ?>
                    </tbody>
                </table>
            </div>
        </div>
        </div>
  <!--</?php } ?>          -->
<div class="row d-none" id="course-page">
    <?php
        if (isset($list_items) && !empty($list_items)){
            foreach ($list_items as $key => $list_item){
                ?>
                    <div class="col-md-6 col-xxl-4 p-3">
                <div class="custom-card-srs   ">
                  <div class="custom-card-header-srs red-to-orange-gradient-srs d-flex justify-content-between align-items-center p-3 border-bottom">
                    <h6 class="card-title mb-0">
                      <span>
                       <?=strtoupper($list_item['title'])?>
                        <span class="badge text-success bg-success-subtle  ms-2" style="font-size: 0.6rem;"><?=ucfirst($list_item['status'])?></span>
                      </span>
                      <!--<span class="sub-text-srs text-dark" style="font-size: 0.6rem;"><?//=$category[$list_item['category_id']]?></span>-->

                    </h6>
                    <div class="dropdown">
                      <button class="btn btn-light btn-sm  rounded-pill" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="ri-more-fill align-middle"></i>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end">
                        <?php
                        if ($list_item['status'] == 'active')
                        {?>
                            <li>
                                <a class="dropdown-item edit-item-btn" href="<?=base_url('admin/course/change_status/'.$list_item['id'].'/?status=pending')?>">
                                    <i class="ri-exchange-box-line align-bottom me-2 text-muted"></i> Mark as Pending
                                </a>
                            </li>
                            
                        <?php
                        }
                        else
                        {?>
                            <li>
                                <a class="dropdown-item edit-item-btn" href="<?=base_url('admin/course/change_status/'.$list_item['id'].'/?status=active')?>">
                                    <i class="ri-exchange-box-line align-bottom me-2 text-muted"></i> Mark as Active
                                </a>
                            </li>
                           
                        <?php 
                        }
                        ?>
                    
                        <li>
                            <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/course/ajax_edit/'.$list_item['id'])?>', 'Update Course')">
                                <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                            </a>
                        </li>
                        <li>
                            <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/course/delete/'.$list_item['id'])?>')">
                                <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                            </a>
                        </li>
                    </ul>
                    </div>
                  </div>
                  <div class="custom-card-body-for-course-page-srs bg-white d-flex justify-content-between align-items-center p-3">
                    <p class="mb-0 w-50">
                      <?php echo '<b>Total Lessons</b>: '.$list_item['lesson'] ?? 0; ?>
                    </p>
                    <div class="text-end" >
                        <span class="text-info fs-6">Enrolled students:</span>
                        <span class="badge text-info  p-3 rounded-pill fs-4">
                           <?=$list_item['enrolled']?>
                        </span>
                    </div>
                  </div>

                  <div class="custom-card-footer-srs p-3 bg-white d-flex justify-content-between align-items-center">
                      <a href="<?=base_url('admin/course/lessons/'.$list_item['id'])?>" class="btn btn-outline-secondary custom-rounded-40px-srs py-1 px-3 me-2" >View Lessons</a>
                  </div>
                </div>
              </div>
              
                <?php
            }
        } else {
            ?>
            <div class="col-12">
                <div class="alert alert-warning text-center" role="alert">
                    No data available
                </div>
            </div>
            <?php
        }
    ?>

</div>

<script>
    
</script>

<style>
#course-page .form-group {
    margin-bottom: 1rem;
}

#course-page .input-group {
    display: flex;
    align-items: center;
}

#course-page .input-group .form-control {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

#course-page .input-group .input-group-text {
    border-left: 0;
    padding: 0.5rem 1rem;
}

#course-page .select2-container .select2-selection--single {
    height: auto;
    padding: 0.375rem 1rem;
    border-radius: 2em;
    border: 1px solid #ced4da;
}

#course-page .select2-container--default .select2-selection--single .select2-selection__rendered {
    line-height: 1.5;
}

#course-page .btn {
    margin-top: 0.5rem;
}

#course-page .btn .ri-equalizer-fill,
#course-page .btn .ri-restart-line {
    vertical-align: middle;
}

</style>

