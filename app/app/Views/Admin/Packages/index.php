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
                        <button class="btn btn-md btn-primary float-end"
                                onclick="show_ajax_modal('<?=base_url('admin/packages/ajax_add/')?>', 'Add Packages')">
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
                        <th style="width: 150px;">Title</th>
                        <th style="width: 120px;">Course</th>
                        <th style="width: 120px;">Amount</th>
                        <th style="width: 120px;">Discount</th>
                        <th style="width: 120px;">Start Date</th>
                        <th style="width: 120px;">End Date</th>
                        <th style="width: 120px;">Offer Price</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                
                                // if($list_item['is_free'] == 0)
                                // {
                                //     $offerp = 0;
                                //     $amount = 0;
                                //     $discount = 0;
                                // }
                                // else
                                // {
                                //     $offerp = $list_item['amount'] - $list_item['discount'];
                                //     $amount = $list_item['amount'];
                                //     $discount = $list_item['discount'];
                                // }
                                if($list_item['is_free'] == 0)
                                {
                                    $offerp = $list_item['amount'] - $list_item['discount'];
                                    $amount = $list_item['amount'];
                                    $discount = $list_item['discount'];
                                }
                                else
                                {
                                    $offerp = 0;
                                    $amount = 0;
                                    $discount = 0;
                                }
                                
                             
                             
                             
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?= $course[$list_item['course_id']] ?? '' ?></td>
                                    <td><?=number_format($amount,2)?></td>
                                    <td><?=number_format($discount,2)?></td>
                                    <td><?=$list_item['start_date']?></td>
                                    <td><?=$list_item['end_date']?></td>
                                    <td><?=number_format($offerp,2)?></td>
                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li class="d-none" >
                                                    <a href="javascript::void()" class="dropdown-item" onclick="show_small_modal('<?=base_url('admin/packages/ajax_view/'.$list_item['id'])?>', 'View Packages')">
                                                        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/packages/ajax_edit/'.$list_item['id'])?>', 'Update Packages')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/packages/delete/'.$list_item['id'])?>')">
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





