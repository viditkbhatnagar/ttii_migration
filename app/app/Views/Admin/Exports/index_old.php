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
<!--    <div class="col-xxl-12">-->
<!--        <div class="mb-2">-->
<!--            <div class="row">-->
<!--                <div class="col-3">-->
<!--                    <input type="text" class="form-control flatpickr-input date-input-custom"-->
<!--                           value="December 9, 2023"-->
<!--                           data-provider="flatpickr" data-altFormat="F j, Y">-->
<!--                </div>-->
<!--                <div class="col-5 text-center">-->
<!--                    <div class="btn-group mt-auto" role="group" aria-label="Basic example">-->
<!--                        <button type="button" class="btn btn-success">Day</button>-->
<!--                        <button type="button" class="btn btn-outline-success">Week</button>-->
<!--                        <button type="button" class="btn btn-outline-success">Month</button>-->
<!--                    </div>-->
<!--                </div>-->
<!--                <div class="col-4 text-end">-->
<!--                   <div class="btn" aria-label="Basic example">-->
<!--                         <button type="button" class="btn btn-success" onclick="show_ajax_modal('<?=base_url('app/work_schedule/ajax_add/')?>', 'Create <?=$page_title ?? ''?>')"><i class="ri-add-fill me-1 align-bottom"></i> Add Away Time</button>-->
<!--                        <button type="button" class="btn btn-warning">Pending(9)</button>-->
<!--                    </div>-->
<!--                </div>-->
<!--            </div>-->
<!--        </div>-->
        <div style="background-color:#fff; !important;">
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
                            <div class="col-lg-12">
                                <div class="col-lg-12 pdf_section">
                                    <img src="<?=base_url()?>assets/app/images/pdf (1).png" class="img-fluid">
                                    <h6>You haven’t created any reports</h6>
                                    <button class="btn btn-success addMembers-modal" onclick="alert_modal_error()" data-bs-toggle="modal" data-bs-target="#addmemberModal">
                                            Generate Reports</button>
                                </div>
                            </div><!-- end col -->
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
                                            <th style="width: 100px;">File</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>1</td>
                                                <td>
                                                    Employees
                                                </td>
                                                <td>
                                                    19-01-2024
                                                </td>
                                                <td>
                                                    <a class="" href="javascript:void(0);" onclick="alert_modal_error()"><i class="bx bxs-file-pdf fs-1 text-danger"></i></a>
                                                </td>
                                            </tr>
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
</div>

<style>
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



