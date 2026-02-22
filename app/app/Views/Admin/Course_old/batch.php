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

                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 120px;">Start Date</th>
                        <th style="width: 120px;">End Date</th>
                        <th style="width: 120px;">Students</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                // Create a DateTime object
                                $fromdate = new \DateTime($list_item['start_date']);
                                $todate = new \DateTime($list_item['end_date']);
                                // Format the date
                                $from = $fromdate->format('M d, Y');
                                $to = $todate->format('M d, Y');
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=$from?></td>
                                    <td><?=$to?></td>
                                    <td><a class="btn btn-md btn-primary" href="<?=base_url('admin/course/students/'.$list_item['id'])?>"><i class="mdi mdi-user"></i>Students</a></td>
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





