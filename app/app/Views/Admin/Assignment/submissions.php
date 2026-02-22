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
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <!--<div class="col-4">-->
                    <!--    <button class="btn btn-md btn-primary rounded-pill float-end"-->
                    <!--            onclick="show_ajax_modal('<//?=base_url('admin/assignment/ajax_add/')?>', 'Add Assignment')">-->
                    <!--        <i class="mdi mdi-plus"></i>-->
                    <!--        Add <//?=$page_title ?? ''?>-->
                    <!--    </button>-->
                    <!--</div>-->
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered  table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Student Name</th>
                        <th style="width: 150px;">Assignment Name</th>
                        <th style="width: 150px;">Assignment File</th>
                        <th style="width: 180px;">Assignment Time</th>
                        <th style="width: 100px;">Submitted Date</th>
                        <th style="width: 100px;">Mark & Remarks</th>
                        <!-- <th style="width: 100px;">Action</th> -->
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($submissions) && !empty($submissions)){
                            foreach ($submissions as $key => $list_item){
                                
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                   
                                    <td><?=$list_item['student_name']?></td>
                                    <td><?=$list_item['title']?>
                                    <br>
                                    <span style="font-style: italic;
                                    font-weight: 900;
                                    font-size: x-small;">Course : <?=$list_item['course_title']?></span>
                                    </td>

                                    <?php 
                                    $files = json_decode($list_item['assignment_files'], true); 
                                    ?>

                                    <td>
                                        <?php if (!empty($files)): ?>
                                            <?php foreach ($files as $file): ?>
                                                <a href="<?= base_url(get_file($file)) ?>" target="_blank" class="badge bg-primary text-decoration-none">
                                                    <i class="ri-eye-line"></i> View File 
                                                </a><br>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <span class="text-muted">No files</span>
                                        <?php endif; ?>
                                    </td>

                                    
                                    <td>Date : <?=date('d M Y',strtotime($list_item['due_date']))?><br>
                                       <?= date('h:i A', strtotime($list_item['from_time'])) ?> to <?= date('h:i A', strtotime($list_item['to_time'])) ?></td>
                                      
                                    <td>
                                        <?= date('d M Y h:i A', strtotime($list_item['submitted_time'])) ?>
                                    </td>
                                    <td>
                                    <span class="badge bg-success"  style="font-size: 1.1   5em; font-weight: normal;"><?= $list_item['marks'] ??  'Not Graded' ?></span><br> 
                                    <?=$list_item['remarks']?> <br><button class="btn btn-sm btn-primary" onclick="show_ajax_modal('<?=base_url('admin/assignment/ajax_edit_remarks/'.$list_item['submission_id'])?>', 'Edit Remarks')">Change mark & remarks</button></td>
                                    
                                       <td class="d-none">
                                        
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/assignment/ajax_submission_edit/'.$list_item['id'])?>', 'Update Assignment')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/assignment/submission_delete/'.$list_item['id'])?>')">
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







