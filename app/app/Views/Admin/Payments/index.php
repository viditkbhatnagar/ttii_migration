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
                                onclick="show_large_modal('<?=base_url('admin/payments/ajax_add/')?>', 'Add Payments')">
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
                        <th style="width: 150px;">User</th>
                        <th style="width: 60px;">Course</th>
                        <th style="width: 60px;">Amount Paid</th>
                        <!-- <th style="width: 150px;">Discount</th> -->
                        <th style="width: 180px;">Date</th>
                        <!--<th style="width: 180px;">Expiry Date</th>-->
                        <th style="width: 180px;">Payment ID</th>
                        <th style="width: 180px;">Remarks</th>
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
                                    <td><?=$list_item['name']?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=$list_item['amount_paid']?></td>
                                    <!-- <td></?=$list_item['discount']?></td> -->
                                    <td><?=date('d-m-Y h:i A',strtotime($list_item['payment_date']))?></td>
                                    <!--<td>-->
                                    <!--    <small class="mx-4"><?=$list_item['expiry_date']?></small>-->
                                    <!--    <br>-->
                                    <!--    <button class="btn btn-md btn-primary" onclick="show_small_modal('<?=base_url('admin/payments/extend_package/'.$list_item['id'])?>', 'Add Extend Package')">Extend Package</button>-->
                                    <!--</td>-->
                                    <td><?=$list_item['razorpay_payment_id']?></td>
                                    <td><?=$list_item['note']?></td>
                                    
                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <!--<li>-->
                                                <!--    <a href="javascript::void()" class="dropdown-item" onclick="show_small_modal('<?=base_url('admin/live_class/ajax_view/'.$list_item['id'])?>', 'View Banner')">-->
                                                <!--        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View-->
                                                <!--    </a>-->
                                                <!--</li>-->
                                                <li>
                                                    <a  target="_blank" href="<?=base_url('admin/payments/print_payment/'.$list_item['id'])?>" class="dropdown-item edit-item-btn" 
                                                        <!--<i class="ri-printer-line align-bottom me-2 text-muted"></i>
                                                        <i class="ri-printer-line me-2 text-muted"></i>Print
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/payments/delete/'.$list_item['id'])?>')">
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





