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
                                onclick="show_small_modal('<?=base_url('admin/demo_video/ajax_add/')?>', 'Add Demo Video')">
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
                        <th style="width: 150px;">Thumbnail</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 150px;">Course</th>
                        <th style="width: 120px;">Video Type</th>
                        <th style="width: 120px;">Video Url</th>
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
                                        <?php
                                        if(!empty($list_item['thumbnail']))
                                        { ?>
                                                <img class="gallery-img img-fluid mx-auto" src="<?= base_url(get_file($list_item['thumbnail'])) ?>" style="width:80%;height:50%;" alt="" />

                                        <?php
                                        }
                                        else
                                        {?>
                                            <img class="gallery-img img-fluid mx-auto" src="<?=base_url('uploads/dummy.webp')?>" style="width:80%;height:50%;" alt="" />
                                              
                                        <?php
                                        }
                                        ?>
                                    </td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=$course[$list_item['course_id']]?></td>
                                    <td>
                                        <?=ucfirst($list_item['video_type'])?>
                                    </td>
                                    <td><?=$list_item['video_url']?></td>
                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_small_modal('<?=base_url('admin/demo_video/ajax_edit/'.$list_item['id'])?>', 'Update Demo Video')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/demo_video/delete/'.$list_item['id'])?>')">
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





