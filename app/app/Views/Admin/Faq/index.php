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
                        <button class="btn btn-md btn-primary rounded-pill float-end"
                                onclick="show_ajax_modal('<?=base_url('admin/faq/ajax_add/')?>', 'Add Faq')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Question</th>
                        <th style="width: 120px;">Answer</th>
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
                                    <td><?=$list_item['question']?></td>
                                    <td><?=$list_item['answer']?></td>
                                    <td>
                                        <a href="javascript::void()" class=" btn btn-secondary btn-sm px-2 rounded-pill edit-item-btn" onclick="show_small_modal('<?=base_url('admin/faq/ajax_edit/'.$list_item['id'])?>', 'Update Faq')">
                                            <i class="ri-pencil-fill align-bottom "></i> Edit
                                        </a>
                                        <a href="javascript::void()" class="btn btn-outline-danger btn-sm px-2 rounded-pill remove-item-btn" onclick="delete_modal('<?=base_url('admin/faq/delete/'.$list_item['id'])?>')">
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





