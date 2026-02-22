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
                    <div class="col-6">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <div class="col-6 d-flex align-items-center justify-content-end">
                        <div class="btn-group me-2" role="group">
                            <button type="button" class="btn btn-outline-primary btn-sm" id="listViewBtn" title="List View">
                                <i class="ri-list-check"></i>
                            </button>
                            <button type="button" class="btn btn-outline-primary btn-sm" id="gridViewBtn" title="Grid View">
                                <i class="ri-layout-grid-line"></i>
                            </button>
                        </div>
                        <div class="">
                            <button class="btn btn-md btn-primary rounded-pill float-end"
                                    onclick="show_small_modal('<?=base_url('admin/batch/ajax_add/')?>', 'Add Intake')">
                                <i class="mdi mdi-plus"></i>
                                Add <?=$page_title ?? ''?>
                            </button>
                        </div>
                    </div>
                </div>

                
            </div>

            <!-- List view -->
            <div id="listView">
                <div class="card-body" style="overflow-x: auto;">
                    <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                        <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th style="width: 150px;">Title</th>
                            <th style="width: 120px;">Description</th>
                            <th style="width: 120px;">Status</th>
                            <th style="width: 120px;">Students</th>
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
                                        <td><?=$list_item['title']?></td>
                                        <td><?=$list_item['description']?></td>
                                        <td>
                                            <?php
                                                $statusText = $list_item['status'] == 1 ? 'Active' : 'Inactive';
                                                $statusClass = $list_item['status'] == 1 ? 'text-success' : 'text-danger';
                                                $statusBg = $list_item['status'] == 1 ? 'bg-success-subtle' : 'bg-danger-subtle';
                                            ?>
                                            <span class="badge <?= $statusClass ?> <?= $statusBg ?>   ms-2" style="font-size: 0.6rem;">
                                                <?= $statusText ?>
                                            </span>
                                        </td>
                                        <td><a class="btn btn-md btn-primary rounded-pill" href="<?=base_url('admin/batch/students/'.$list_item['id'])?>"><i class="mdi mdi-user"></i>Students</a></td>
                                        
                                        <td>
                                            <a href="javascript::void()" class=" btn btn-secondary btn-sm px-2 rounded-pill edit-item-btn" onclick="show_small_modal('<?=base_url('admin/batch/ajax_edit/'.$list_item['id'])?>', 'Update Intake')">
                                                <i class="ri-pencil-fill align-bottom "></i> Edit
                                            </a>
                                            <a href="javascript::void()" class="btn btn-outline-danger btn-sm px-2 rounded-pill remove-item-btn" onclick="delete_modal('<?=base_url('admin/batch/delete/'.$list_item['id'])?>')">
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
            <!-- End List View -->

            <!-- Grid View -->

            <div id="gridView" class="row" style="display: none;">
                <?php  
                    if (isset($list_items)){
                        foreach ($list_items as $key => $list_item){
                        ?>
                            <div class="col-md-6 col-xxl-4 p-3">
                                <div class="custom-card-srs ">
                                    <div class="custom-card-header-srs d-flex justify-content-between align-items-center" style="background-color: #A85893 !important;">
                                        <h6 class="card-title mb-0 text-light">
                                            <?=$list_item['title']?>
                                        </h6>
                                        <?php
                                            $statusText = $list_item['status'] == 1 ? 'Active' : 'Inactive';
                                            $statusClass = $list_item['status'] == 1 ? 'text-success' : 'text-danger';
                                            $statusBg = $list_item['status'] == 1 ? 'bg-success-subtle' : 'bg-danger-subtle';
                                        ?>
                                        <span class="badge <?= $statusClass ?> <?= $statusBg ?>   ms-2" style="font-size: 0.6rem;">
                                            <?= $statusText ?>
                                        </span>
                                    </div>
                                    <div class="custom-card-body-srs bg-white">
                                        <p class="card-text d-none"><?= $course[$list_item['course_id']] ?? 'No courses assigned' ?></p>
                                        <p class="card-text"><?=$list_item['description']?></p>
                                    </div>
                                    <div class="custom-card-footer-srs bg-white">
                                        <div>
                                            <button class="btn  btn-outline-secondary custom-rounded-40px-srs py-1 px-3" onclick="show_small_modal('<?=base_url('admin/batch/ajax_edit/'.$list_item['id'])?>', 'Update Intake')">
                                                <i class="ri-pencil-fill  fs-6"></i>
                                            </button>
                                            <button class="btn  btn-outline-danger custom-rounded-40px-srs py-1 px-3" onclick="delete_modal('<?=base_url('admin/batch/delete/'.$list_item['id'])?>')">
                                                <i class="ri-delete-bin-fill  fs-6"></i>
                                            </button>
                                        </div>
                                        <a href="<?=base_url('admin/batch/students/'.$list_item['id'])?>" class="btn  btn-outline-success  custom-rounded-40px-srs py-1 px-3">View Students </a>
                                    </div>
                                </div>
                                
                            </div><!-- end col -->
                            <?php
                        }
                    }
                ?>
            </div>
            <!-- End GRid View -->

        </div>
    </div>
</div><!--end row-->



<script>
    $(document).ready(function () {
        $('#listViewBtn').click(function () {
            $('#gridView').hide();
            $('#listView').show();
        });

        $('#gridViewBtn').click(function () {
            $('#listView').hide();
            $('#gridView').show();
        });
    });
</script>