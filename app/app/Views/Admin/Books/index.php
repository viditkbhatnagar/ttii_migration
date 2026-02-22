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
                                onclick="show_ajax_modal('<?=base_url('admin/Books/ajax_add/')?>', 'Add Book')">
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
                        <th style="width: 120px;">Author</th>
                        <th style="width: 120px;">Description</th>
                        <th style="width: 120px;">Cover Image</th>
                        <th style="width: 120px;">Chapters</th>
                        <th style="width: 120px;">Status</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($list_items)){

                            foreach ($list_items as $key => $list_item){
                                ?>
                                <tr>
                                    <td><?= $key + 1 ?></td>
                                    <td><?= $list_item['title'] ?></td>
                                    <td><?= $list_item['author'] ?></td>
                                    <td><?= $list_item['description'] ?></td>
                                    <td> 
                                        <?php
                                            if(!empty($list_item['cover_image']))
                                            { ?>
                                                <img src="<?= base_url(get_file($list_item['cover_image'])) ?>" class="img-thumbnail" alt="cover image" style="max-width: 50px;">
                                            <?php
                                            }
                                        ?>
                                    </td>
                                    <td> 
                                        <a class="btn btn-sm btn-primary rounded-pill" href="<?=base_url('admin/books/chapters/'.$list_item['book_id'])?>">
                                           Chapters
                                        </a>
                                    </td>
                                    <td><?= $list_item['status'] ?></td>

                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li class="d-none">
                                                    <a href="javascript::void()" class="dropdown-item" onclick="show_small_modal('<?=base_url('admin/books/ajax_view/'.$list_item['book_id'])?>', 'View Book')">
                                                        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/books/ajax_edit/'.$list_item['book_id'])?>', 'Update Book')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/books/delete/'.$list_item['book_id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="<?=base_url('admin/books/change_device/'.$list_item['book_id'])?>" class="dropdown-item" >
                                                        <i class="ri-exchange-fill align-bottom me-2 text-muted"></i> Change Device
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





