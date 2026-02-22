<form autocomplete="off" action="<?= base_url('admin/live_class/add') ?>" id="addCohortLiveClassForm" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <input type="hidden" name="cohort_id" value="<?= $cohort_id ?>"> 
                        
                        <div class="row">
                            
                            <div class="col-lg-6 p-2">
                                <label class="form-label">Zoom ID<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" readonly name="zoom_id" required value="<?= $zoom_id ?>">
                            </div>

                            <div class="col-lg-6 p-2">
                                <label class="form-label">Password<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" readonly name="password" required value="<?= $zoom_password ?>">
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <label class="form-label">Session ID<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" name="session_id" required value="<?=$session_id?>" readonly>
                            </div>

                            <div class="col-lg-6 p-2">
                                <label class="form-label">Title<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" name="title" required>
                            </div>

                            <div class="col-lg-6">
                                <label class="form-label">Date<span class="required text-danger">*</span></label>
                                <input type="date" class="form-control" name="date" required>
                            </div>

                            <div class="col-lg-6">
                                <label class="form-label">From Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" name="fromTime" required>
                            </div>

                            <div class="col-lg-6">
                                <label class="form-label">To Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" name="toTime" required>
                            </div>

                            <!-- Checkbox for repetitive sessions -->
                            <div class="col-lg-12 mt-3">
                                <input type="checkbox" id="is_repetitive" name="is_repetitive">
                                <label for="is_repetitive">Is Repetitive?</label>
                            </div>

                            <!-- Section for adding multiple dates -->
                            <div class="col-lg-12 mt-3" id="repeat_dates_section" style="display: none;">
                                <label class="form-label">Select Multiple Dates</label>
                                <div id="date_fields">
                                    <div class="input-group mb-2">
                                        <input type="date" name="repeat_dates[]" class="form-control">
                                        <button type="button" class="btn btn-success add_date"><b>+</b></button>
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex align-items-start gap-3 mt-4">
                                <button type="submit" id="liveClassSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab">Save</button>
                            </div>
                        </div> <!-- end row -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>


<script>
$(document).ready(function () {
    // Hide the repeat dates section initially
    $('#repeat_dates_section').hide();

    // Show/Hide the repeat dates section when checkbox is clicked
    $('#is_repetitive').change(function () {
        if ($(this).is(':checked')) {
            $('#repeat_dates_section').slideDown();
        } else {
            $('#repeat_dates_section').slideUp();
            $("#date_fields").html(`
                <div class="input-group mb-2">
                    <input type="date" name="repeat_dates[]" class="form-control">
                    <button type="button" class="btn btn-success add_date"><b>+</b></button>
                </div>
            `); // Reset to one field
        }
    });

    // Add a new date input field
    $(document).on('click', '.add_date', function () {
        let newField = `
            <div class="input-group mb-2">
                <input type="date" name="repeat_dates[]" class="form-control">
                <button type="button" class="btn btn-danger remove_date"><b>-</b></button>
            </div>
        `;
        $("#date_fields").append(newField);
    });

    // Remove a date input field
    $(document).on('click', '.remove_date', function () {
        $(this).closest('.input-group').remove();
    });
});

$("#liveClassSubmitBtn").on("click", function (e) {
    e.preventDefault();

    var form = document.getElementById("addCohortLiveClassForm");
    
    var routeUrl = "<?=base_url('admin/Live_class/add')?>";
    
    ajax(form,routeUrl,$("#pills-activities-info-tab"));
    
});

        function ajax(form,routeUrl,triggerId) {
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
                            
                            let reload = '#pills-live-sessions-info';
                            let cohortId = <?= $cohort_id ?>;
                            
                            $.get("<?= base_url('admin/Cohorts/cohort_edit/') ?>" + cohortId, function (data) {
                                let html = $('<div>').html(data); // Wrap the entire HTML in a temporary container
                                let newContent = html.find(reload).html(); // Get only the inner content of #liveSessionCard
                                $(reload).html(newContent); // Replace current content
                                $('html, body').animate({
                                    scrollTop: $('#pills-live-sessions-info').offset().top - 100
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