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
                    <!--    <button class="btn btn-md btn-primary float-end" onclick="show_small_modal('<?=base_url('admin/course/ajax_add_sudent/')?>', 'Add Student to Batch')">-->
                    <!--        <i class="mdi mdi-plus"></i>-->
                    <!--        Add Student to Batch-->
                    <!--    </button>-->
                    <!--</div>-->
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Student Name</th>
                        <th style="width: 150px;">Phone Number</th>
                        <th style="width: 150px;">Action</th>
                        <!--<th style="width: 150px;">Enrolled date</th>-->
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                           
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                   <td><?=$list_item['name']?></td>
                                   <td><?=$list_item['phone']?></td>
                                   <td><a href="javascript::void()" class="remove-item-btn" onclick="delete_modal('<?=base_url('admin/course/delete_from_enrol/'.$list_item['id'].'/'.$course_id)?>')">
                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> 
                                        </a>
                                    </td>
                                   <!--<td><?//=$list_item['email']?></td>-->
                                   <!--<td><?//=$date?></td>-->

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





