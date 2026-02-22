<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Settings</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<!-- end page title -->
<div class="row">
    <div >
        <div>
            <!-- Nav tabs -->
            <ul class="nav nav-tabs nav-justified nav-border-top nav-border-top-success mb-3" role="tablist">
                <li class="nav-item">
                    <a class="nav-link active" data-bs-toggle="tab" href="#nav-border-justified-overview" role="tab" aria-selected="false">
                        Generate Export
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#nav-border-justified-compare-employee" role="tab" aria-selected="false">
                        Export History
                    </a>
                </li>
            </ul>
        </div>
        <div class="tab-content text-muted">
            <div class="tab-pane active" id="nav-border-justified-overview" role="tabpanel">
                <div class="row mb-4">
                    <?php foreach($export_types as $export_type){ ?>
                        <div class="col-xl-4 col-md-6">
                            <div class="card card-animate">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between mt-1">
                                        <div class="col-10">
                                            <h4 class="fs-16 fw-semibold ff-secondary mb-2 text-primary"><?=$export_type['title']?></h4>
                                            <span class="text-muted fs-13"><?=$export_type['description']?></span>
                                        </div>
                                        <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                            <span class="avatar-title bg-info-subtle rounded fs-3">
                                                <i class="<?=$export_type['icon']?> text-info"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div class="mt-4">
                                        <a href="javascript:void(0);" onclick="show_ajax_modal('<?=base_url('app/exports/ajax_generate/'.$export_type['id'])?>', 'EXPORT <?=ucfirst($export_type['title']) ?? ''?>')" class="btn btn-md btn-primary float-end">GENERATE<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php } ?>
                    
                </div>
                <!--end row-->
            </div>
            <div class="tab-pane" id="nav-border-justified-compare-employee" role="tabpanel">
                <div class="row mb-4">
                    <div class="col-lg-12">
                        <div class="card">
                            <div class="card-body">
                                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                                    <thead>
                                    <tr>
                                        <th style="width: 50px;">#</th>
                                        <th style="width: 150px;">Title</th>
                                        <th style="width: 120px;">Date</th>
                                        <th style="width: 100px;">File Size</th>
                                        <th style="width: 100px;">File</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach($export_history as $key => $history){ ?>
                                            <tr>
                                                <td><?=++$key?></td>
                                                <td>
                                                    <?=$history['title']?>
                                                </td>
                                                <td>
                                                    <?=date('d-m-Y h:i A', strtotime($history['created_at']))?>
                                                </td>
                                                <td>
                                                    <?=$history['file_size'].'Kb'?>
                                                </td>
                                                <td>
                                                    <a class="" href="<?=base_url(get_file($history['csv_file']))?>" download="<?=$history['title']?>"><i class="bx bx-file text-primary fs-4"></i></a>
                                                </td>
                                            </tr>
                                        <?php } ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div><!-- end col -->
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.col-10{
    height: 100px;
}
.nav-border-top-success .nav-link.active {
    color: #0ab39c;
    border-top-color: #0ab39c;
    background-color: #fff;
}
.pdf_section{
    text-align:center;
    margin-bottom:20px;
}
.pdf_section h6{
    padding-top:30px;
    padding-bottom:10px;
    color:#878A99;
}
.pdf_section img{
    width:9%;
}
</style>



