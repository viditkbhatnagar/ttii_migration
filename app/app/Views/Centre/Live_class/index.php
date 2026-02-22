<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('centre/dashboard/index')?>">Dashboard</a></li>
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
                    <div class="col-4">
                        <button class="btn btn-md btn-primary rounded-pill float-end"
                                onclick="show_ajax_modal('<?=base_url('centre/live_class/ajax_add/')?>', 'Add Live')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body d-none">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 60px;">Role</th>
                        <!--<th style="width: 60px;">Course</th>-->
                        <!--<th style="width: 60px;">Package</th>-->
                        <th style="width: 150px;">Zoom</th>
                        <th style="width: 180px;">Time</th>
                        <th style="width: 180px;">Date</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=($list_item['role_id']==2) ? 'Student' : 'Instructor'?></td>
                                    <//td><//?=$course[$list_item['course_id']]?><///td>
                                    <!--<td><//?=$package[$list_item['package_id']]?></td>-->
                                    <td>Zoom ID: <?=$list_item['zoom_id']?><br>Password: <?=$list_item['password']?></td>
                                    <td>From: <?= date('h:i A', strtotime($list_item['fromTime'])) ?><br>To: <?= date('h:i A', strtotime($list_item['toTime'])) ?></td>
                                    <td>From: <?= date('d-m-Y', strtotime($list_item['fromDate'])) ?><br>To: <?= date('d-m-Y', strtotime($list_item['toDate'])) ?></td>
                                    
                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <!--<li>-->
                                                <!--    <a href="javascript::void()" class="dropdown-item" onclick="show_small_modal('<?=base_url('centre/live_class/ajax_view/'.$list_item['id'])?>', 'View Banner')">-->
                                                <!--        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View-->
                                                <!--    </a>-->
                                                <!--</li>-->
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn d-none" onclick="show_ajax_modal('<?=base_url('centre/live_class/ajax_edit/'.$list_item['id'])?>', 'Update Live Class')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('centre/live_class/delete/'.$list_item['id'])?>')">
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
</div><!--end row-->

<div class="row ">
    <?php 
                   
        if (isset($list_items)){
            foreach ($list_items as $key => $list_item){
                
                ?>
                <div class="col-md-6 col-xxl-4">
              <div class="card card-animate rounded-4  border">
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-3">
                        <div class="avatar-sm flex-shrink-0">
                            <span class="avatar-title bg-light text-primary rounded-2 fs-2">
                                <i class="ri-live-line"></i>
                            </span>
                        </div>
                        <div class="flex-grow-1 overflow-hidden ms-3">
                            <p class="text-uppercase fw-bold text-primary mb-0"><?=$list_item['title']?></p>
                        </div>
                    </div>
                    <div class="custom-details-card ">
                      <div class="row">
                          <div class="col-6">
                              
                          </div>
                          <div class="col-6">
                              <div class="detail-item mb-2">
                                  <h6 class="fw-bold mb-1">Time</h6>
                                  <p class="text-muted m-0"><?= date('h:i A', strtotime($list_item['fromTime'])) ?> To: <?= date('h:i A', strtotime($list_item['toTime'])) ?></p>
                              </div>
                              <div class="detail-item mb-2">
                                  <h6 class="fw-bold mb-1">Date</h6>
                                  <p class="text-muted m-0"><?= date('d-m-Y', strtotime($list_item['date'])) ?> </p>
                              </div>
                          </div>
                      </div>
                  </div>               
                    <div class="d-flex justify-content-end">
                        <button class=" btn btn-outline-secondary me-2 custom-rounded-40px-srs py-1 px-3" onclick="show_ajax_modal('<?=base_url('centre/live_class/ajax_edit/'.$list_item['id'])?>', 'Update Live Session')">
                            <i class="ri-pencil-fill fs-6"></i> Edit
                        </button>
                      
                        <button class="btn btn-outline-danger custom-rounded-40px-srs py-1 px-3" onclick="delete_modal('<?=base_url('centre/live_class/delete/'.$list_item['id'])?>')">
                            <i class="ri-delete-bin-fill fs-6"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
            
          </div><!-- end col -->
                
          <?php
            }
        }
    ?>
</div>





