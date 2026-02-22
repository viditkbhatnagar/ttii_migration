
<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <a href="<?= base_url('app/students/index') ?>" class="btn btn-md btn-outline-secondary float-end mx-2"><i class="ri-arrow-go-back-fill"></i> Back</a>
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
        
        <!--<div class="row">-->
        <!--    <div class="col-2">-->
        <!--        <a href="<?//=base_url('app/course/index')?>" class="btn btn-md btn-outline-secondary m-2"><i class="ri-arrow-go-back-fill"></i> Back</a>-->
        <!--    </div>-->
        <!--    <div class="col-8 mt-3">-->
        <!--        <h4 class="text-center"><?//=$student_name?></h4>-->
        <!--    </div>-->
        <!--</div>-->
        
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?> of <?=$student_name?></h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-primary float-end"
                                onclick="show_small_modal('<?=base_url('app/students/ajax_add_enrolled_courses/'.$student_id)?>', 'Add <?=$page_title ?? ''?>')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                        
                    </div>
                    
                </div>


            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table id="" class="data_table_basic table table-bordered  table-striped align-middle" style="width:100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Course</th>
                            <!--<th>Teacher</th>-->
                            <!--<th>Individual</th>-->
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                         <?php 
                            if (isset($list_items)){
                                // log_message('error','$list_items '.print_r($list_items,true));
                                foreach ($list_items as $key => $list_item){
                        ?>
                            <tr> 
                                <td><?= ++$key ?></td>
                                <td><?= isset( $course_titles[$list_item['course_id']]) ? $course_titles[$list_item['course_id']] : '' ?></td>
                                <!--<td><?= isset( $teachers_list[$list_item['teacher_id']] ) ? $teachers_list[$list_item['teacher_id']] : '' ?></td>-->
                                
                                <td>
                                    <a class="btn btn-sm btn-danger" onclick="delete_modal('<?=base_url('app/students/delete_enrolled_course/'.$list_item['id'])?>')">
                                        <i class="ri-delete-bin-fill align-bottom"></i> Delete
                                    </a>
                                    <a href="javascript:void(0)" class="btn btn-sm btn-warning" onclick="show_small_modal('<?=base_url('app/students/ajax_edit_enrolled_courses/'.$list_item['id'].'/'.$list_item['university_id'])?>','Edit Enrolled Course')">
                                        <i class="ri-pencil-fill"></i> Edit
                                    </a>
                                </td>
                            </tr>
                        <?php } } ?>
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    </div>
</div><!--end row-->
