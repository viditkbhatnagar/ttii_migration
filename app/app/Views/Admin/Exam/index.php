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
                    <div class="col-4">
                        <a href="<?=base_url('admin/exam/add/')?>" class="btn btn-md btn-primary rounded-pill float-end">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </a>
                        
                          <button class="btn btn-md btn-primary rounded-pill float-end d-none"
                                onclick="show_ajax_modal('<?=base_url('admin/exam/ajax_add/')?>', 'Add exam')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 150px;">Course</th>
                        <th style="width: 150px;">Batch</th>
                        <th style="width: 250px;">Instruction</th>
                        <th style="width: 150px;">Question Bank</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=$course[$list_item['course_id']]?></td>
                                    <td><?=$course[$list_item['course_id']]?></td>
                                    <td><?=$list_item['description']?></td>
                                    <td><a class="btn btn-md btn-primary rounded-pill" href="<?=base_url('admin/exam/exam_questions/'.$list_item['id'])?>"><i class="mdi mdi-user"></i>Questions</a></td>
                                    <td>
                                        <a href="javascript::void()" class=" btn btn-secondary btn-sm px-2 rounded-pill edit-item-btn d-none" onclick="show_ajax_modal('<?=base_url('admin/exam/ajax_edit/'.$list_item['id'])?>', 'Update Exam')">
                                            <i class="ri-pencil-fill align-bottom "></i> Edit
                                        </a>
                                          <a href="<?=base_url('admin/exam/edit/'.$list_item['id'])?>" class=" btn btn-secondary btn-sm px-2 rounded-pill edit-item-btn" >
                                            <i class="ri-pencil-fill align-bottom "></i> Edit
                                        </a>
                                        <a href="javascript::void()" class="btn btn-outline-danger btn-sm px-2 rounded-pill remove-item-btn" onclick="delete_modal('<?=base_url('admin/exam/delete/'.$list_item['id'])?>')">
                                            <i class="ri-delete-bin-fill align-bottom "></i> Delete
                                        </a>
                                        
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





