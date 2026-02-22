<?php
    if(isset($_GET['live_id'])){
        $live_id = $_GET['live_id'];
    }else{
        $live_id = '';
    }
?>
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
<form action="" method="get">
    <div class="row mb-3">
        <div class="col-3">
            <select class="form-control select2" name="live_id" id="live_id" required>
                <option value="">Choose Live</option>
                <?php foreach($lives as $live){ ?>
                    <option value="<?=$live['id']?>" <?=$live_id==$live['id'] ? 'selected' : ''?>><?=$live['title']?></option>
                <?php } ?>    
            </select>
        </div>
        <div class="col-3">
            <input type="date" class="form-control" name="date" value="<?=(isset($_GET['date'])) ? $_GET['date'] : ''?>" required> 
        </div>
        <div class="col-3">
            <input type="submit" class="btn btn-primary">
        </div>
    </div>
</form>
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th style="width: 150px;">Name</th>
                            <th style="width: 150px;">Join Time</th>
                            <th style="width: 150px;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach($list_items as $key =>  $items){?>
                            <tr>
                                <td><?=$key+1?></td>
                                <td><?=$users[$items['user_id']]?></td>
                                <td><?=$items['join_time']?></td>
                                <td><?=date('d-m-Y', strtotime($items['created_at']))?></td>
                            </tr>
                        <?php } ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div><!--end row-->
