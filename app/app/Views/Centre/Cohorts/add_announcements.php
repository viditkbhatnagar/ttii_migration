<form autocomplete="off" action="<?= base_url('centre/cohorts/add_announcement') ?>" method="post" enctype="multipart/form-data" id="announcementsAddForm">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row">
                            <input type="hidden" name="cohort_id">
                            <!-- Title -->
                            <div class="col-lg-6 p-2">
                                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" id="title" name="title" required>
                            </div>
                            
                            <!-- Content -->
                            <div class="col-lg-8 p-2">
                                <label for="content" class="form-label">Content<span class="required text-danger">*</span></label>
                                <textarea class="form-control" id="content" name="content" rows="3"></textarea>
                            </div>
                            
                            <!-- Description -->               
                            <div class="col-12 p-2 form-group">
                                <label for="description" class="form-label">Description</label>
                                <textarea class="form-textarea editor" name="description" id="editor2"></textarea>
                            </div>
                            

                            <div class="d-flex align-items-start gap-3 mt-4">
                                <button type="button" id="announcementsSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab"><i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Save & Next</button>
                            </div>
                        </div>
                        <!--end row-->
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

<script>
    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector( '#editor2' ) )
            .catch( error => {
                console.error( error );
            });

    });
</script>
