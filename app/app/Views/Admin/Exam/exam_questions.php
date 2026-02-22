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
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?>  <?= isset($exam_title) ? ' - for '. $exam_title : '' ?></h5>
                    </div>
                    <div class="col-4">

                        <a href="<?=base_url('admin/exam/add_questions/'.$exam_id)?>" class="ml-1" style="margin-right:4px;">
                            <button class="btn btn-md btn-outline-primary float-end"><i class="mdi mdi-plus"></i>Choose Questions</button>
                        </a>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                  
                        <th style="width: 150px;">Question</th>
                        <th style="width: 150px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php

                    if (isset($list_items)){
                        foreach ($list_items as $key => $list_item){
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    
                                    <td>
                                        <?= isset($question_title[$list_item['question_id']]) ? $question_title[$list_item['question_id']] : '' ?>
                                    </td>
                                    <td>
                                        <button onclick="delete_modal('<?=base_url('admin/exam/remove_exam_questions/'.$list_item['exam_id'].'/'.$list_item['question_id'])?>')" class="btn btn-outline-danger btn-sm float-right" style="margin-left: 10px;">
                                            <i class="mdi mdi-window-close"></i> Remove
                                        </button>
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





