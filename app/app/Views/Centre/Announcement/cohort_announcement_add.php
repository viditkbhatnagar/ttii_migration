<form autocomplete="off" action="<?= base_url('admin/cohorts/add_announcement') ?>" method="post" enctype="multipart/form-data" id="announcementsAddForm">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row">
                            <input type="hidden" name="cohort_id" value="<?= $cohort_id ?>">
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
                                <button type="button" id="announcementsAddBtn" class="btn btn-success btn-label right ms-auto nexttab"><i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Save</button>
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
    
    $("#announcementsAddBtn").on("click", function (e) {
        e.preventDefault();
    
        var form = document.getElementById("announcementsAddForm");
        
        var routeUrl = "<?=base_url('admin/cohorts/add_cohort_announcements')?>";
        
        ajax(form,routeUrl);
        
    });

        function ajax(form,routeUrl) {
            var formData = new FormData(form);
            $.ajax({
                url: routeUrl, 
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                dataType: "json",
                success: function (response) {
                    if (response.success) { 
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: response.message,
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            $('#ajax_modal').modal('hide');
                            
                            let reload = '#pills-announcements-info';
                            let cohortId = <?= $cohort_id ?>;
                            
                            $.get("<?= base_url('admin/Cohorts/cohort_edit/') ?>" + cohortId, function (data) {
                                let html = $('<div>').html(data); // Wrap the entire HTML in a temporary container
                                let newContent = html.find(reload).html(); // Get only the inner content of #liveSessionCard
                                $(reload).html(newContent); // Replace current content
                                $('html, body').animate({
                                    scrollTop: $('#pills-announcements-info').offset().top - 100
                                }, 800);
                            });
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: response.message || "Something went wrong!",
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: "Failed to submit data. Please try again.",
                    });
                }
            });  
        }
</script>
