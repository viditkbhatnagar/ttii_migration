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
                                onclick="show_ajax_modal('<?=base_url('admin/circulars/ajax_add/')?>', 'Add Circular')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered  table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Image</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 150px;">Description</th>
                        <th style="width: 150px;">Objectives</th>
                        <th style="width: 180px;">Time</th>
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
                                    <td>
                                        <img src="<?=base_url(get_file($list_item['image']))?>" width="120px">
                                    </td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=$list_item['description']?></td>
                                    <td>
                                        <?php $decoded_objectives = json_decode($list_item['objectives'],true) ?>
                                        <ul>
                                            <?php foreach($decoded_objectives as $decoded_objective){ ?>
                                                <li><?=$decoded_objective?></li>
                                            <?php } ?>
                                        </ul>    
                                    </td>
                                    <td>Date : <?=$list_item['event_date']?><br>
                                        From: <?= date('h:i A', strtotime($list_item['from_time'])) ?><br>To: <?= date('h:i A', strtotime($list_item['to_time'])) ?></td>
                                    
                                    <td>
                                        <?php
                                        if($list_item['is_recording_available'] == 1)
                                        { ?>
                                        <a class="btn btn-md btn-primary" href="<?=base_url('admin/recorded_events/index/'.$list_item['id'])?>"><i class="mdi mdi-user"></i>Records</a><br><hr>
                                        <?php
                                        }
                                        ?>
                                        
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/events/ajax_edit/'.$list_item['id'])?>', 'Update Event')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/events/delete/'.$list_item['id'])?>')">
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







