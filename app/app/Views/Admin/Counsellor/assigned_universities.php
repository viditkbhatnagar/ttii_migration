<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <!--<a href="javascript: history.go(-1)" class="btn btn-md btn-outline-secondary float-end mx-2"><i class="ri-arrow-go-back-fill"></i> Back</a>-->
            <a href="<?= base_url('app/consultant/index') ?>" class="btn btn-md btn-outline-secondary float-end mx-2"><i class="ri-arrow-go-back-fill"></i> Back</a>
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?=base_url('app/consultant/index')?>">Consultants</a></li>
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
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?> of <?= $user_data['name'] ?></h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary float-end"
                                onclick="show_small_modal('<?=base_url('app/consultant/ajax_add_universities/'.$user_data['id'])?>', 'Add university')">
                            <i class="mdi mdi-plus"></i>
                            Add Universities
                        </button>
                    </div>
                </div>


            </div>
                        
            <div class="card-body">
                <div class="table-responsive">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>University</th>
                        <th style="width: 120px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($university_data)){
                            foreach ($university_data as $key => $list_item){
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title'] ?? ''?></td>
                                    <td>
                                        <a href="javascript::void()" class="btn btn-danger btn-sm" onclick="delete_modal('<?=base_url('app/consultant/delete_university/'.$list_item['id'].'/'.$user_data['id'])?>')">
                                            Remove
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
        </div>
    </div>
</div><!--end row-->





