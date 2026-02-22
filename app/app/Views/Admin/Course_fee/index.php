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
                            <th>Course Name</th>
                            <th>Base Fee</th>
                            <th>offer Fee</th>
                            <!--<th>Installments</th>-->
                            <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=number_format($list_item['price'],2)?></td>
                                    <td><?=number_format($list_item['total_amount'],2)?></td>
                                    <td>
                                        
                                        <a href="<?=base_url('admin/course_fee/view_payments/'.$list_item['id'])?>" class="btn btn-outline-primary btn-sm rounded-4">View Payments</a>
                                        
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





