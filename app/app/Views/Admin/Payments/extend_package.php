<form  action="<?=base_url('admin/payments/extend_package_submit/'.$payment_id)?>" method="post"  enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row gy-4">
                            <!--end col-->
                            <div class="col-lg-12 p-2">
                                <div>
                                    <label for="name" class="form-label">Expiry Date<span class="required text-danger">*</span></label>
                                    <input type="date" name="expiry_date" class="form-control">
                                </div>
                            </div>
                            
                            <div class="col-12 p-2">
                                <button class="btn btn-success float-end btn-save" type="submit">
                                    <i class="ri-check-fill"></i> Save
                                </button>
                            </div>
                            
                        </div>
                        <!--end row-->
                    </div>
                </div>
            </div>
        </div>
        <!--end col-->
    </div>
</form>

