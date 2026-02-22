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
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Student Name</th>
                        <th>Installment Details</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Payment Mode</th>
                        <th>Payment To</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['student']?></td>
                                    <td><?=$list_item['installment_details']?></td>
                                    <td><?=$list_item['amount']?></td>
                                    <td><?=$list_item['due_date']?></td>
                                    <td><?=$list_item['payment_mode']?></td>
                                    <td><?=$list_item['payment_to']?></td>
                                    <td><?=$list_item['status']?></td>
                                   
                                   
                                    
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





