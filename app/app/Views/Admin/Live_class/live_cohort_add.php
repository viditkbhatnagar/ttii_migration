<!-- New Live Add Form added on 29/11/2025 -->
<form autocomplete="off" action="<?= base_url('admin/live_class/add') ?>" id="addCohortLiveClassForm" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <input type="hidden" name="cohort_id" value="<?= $cohort_id ?>"> 
                        
                        <!-- Common Fields (Zoom ID & Password) -->
                        <div class="row mb-4">
                            <div class="col-lg-6 p-2">
                                <label class="form-label">Zoom ID<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" readonly name="zoom_id" required value="<?= $zoom_id ?>">
                            </div>

                            <div class="col-lg-6 p-2">
                                <label class="form-label">Password<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" readonly name="password" required value="<?= $zoom_password ?>">
                            </div>
                        </div>

                        <hr class="my-4">

                        <!-- Dynamic Live Class Entries -->
                        <div id="live_class_entries">
                            <div class="live-class-entry" data-entry="1">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="mb-0">Live Class Entry #1</h5>
                                </div>
                                
                                <div class="row">
                                    <div class="col-lg-6 p-2">
                                        <label class="form-label">Session ID<span class="required text-danger">*</span></label>
                                        <input type="text" class="form-control" name="entries[0][session_id]" required value="<?=$session_id?>" readonly>
                                    </div>

                                    <div class="col-lg-6 p-2">
                                        <label class="form-label">Title<span class="required text-danger">*</span></label>
                                        <input type="text" class="form-control" name="entries[0][title]" required>
                                    </div>

                                    <div class="col-lg-6 p-2">
                                        <label class="form-label">Date<span class="required text-danger">*</span></label>
                                        <input type="date" class="form-control" name="entries[0][date]" required>
                                    </div>

                                    <div class="col-lg-6 p-2">
                                        <label class="form-label">From Time<span class="required text-danger">*</span></label>
                                        <input type="time" class="form-control" name="entries[0][fromTime]" required>
                                    </div>

                                    <div class="col-lg-6 p-2">
                                        <label class="form-label">To Time<span class="required text-danger">*</span></label>
                                        <input type="time" class="form-control" name="entries[0][toTime]" required>
                                    </div>

                                    <!-- Checkbox for repetitive sessions -->
                                    <div class="col-lg-6 p-2 d-flex align-items-center">
                                        <input type="checkbox" id="is_repetitive_0" name="entries[0][is_repetitive]" class="me-2">
                                        <label for="is_repetitive_0" class="mb-0">Is Repetitive?</label>
                                    </div>

                                    <!-- Section for adding multiple dates -->
                                    <div class="col-lg-12 mt-3 repeat-dates-section" id="repeat_dates_section_0" style="display: none;">
                                        <label class="form-label">Select Multiple Dates</label>
                                        <div class="date-fields-container">
                                            <div class="input-group mb-2">
                                                <input type="date" name="entries[0][repeat_dates][]" class="form-control">
                                                <button type="button" class="btn btn-success add_date_btn"><b>+</b></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <hr class="my-4">
                            </div>
                        </div>

                        <!-- Add New Entry Button -->
                        <div class="text-center mb-3">
                            <button type="button" id="add_entry_btn" class="btn btn-primary">
                                <i class="ri-add-line"></i> Add Another Live Class Entry
                            </button>
                        </div>

                        <div class="d-flex align-items-start gap-3 mt-4">
                            <button type="submit" id="liveClassSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab">Save All Entries</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

<script>
$(document).ready(function () {
    let entryCount = 1;

    // Show/Hide repeat dates section for each entry
    $(document).on('change', '[id^="is_repetitive_"]', function () {
        let index = $(this).attr('id').split('_').pop();
        let section = $('#repeat_dates_section_' + index);
        
        if ($(this).is(':checked')) {
            section.slideDown();
        } else {
            section.slideUp();
            section.find('.date-fields-container').html(`
                <div class="input-group mb-2">
                    <input type="date" name="entries[${index}][repeat_dates][]" class="form-control">
                    <button type="button" class="btn btn-success add_date_btn"><b>+</b></button>
                </div>
            `);
        }
    });

    // Add a new date input field
    $(document).on('click', '.add_date_btn', function () {
        let container = $(this).closest('.date-fields-container');
        let entryIndex = $(this).closest('.live-class-entry').data('entry') - 1;
        
        let newField = `
            <div class="input-group mb-2">
                <input type="date" name="entries[${entryIndex}][repeat_dates][]" class="form-control">
                <button type="button" class="btn btn-danger remove_date_btn"><b>-</b></button>
            </div>
        `;
        container.append(newField);
    });

    // Remove a date input field
    $(document).on('click', '.remove_date_btn', function () {
        $(this).closest('.input-group').remove();
    });

    // Add new live class entry
    $('#add_entry_btn').on('click', function () {
        entryCount++;
        let newIndex = entryCount - 1;
        
        // Get the last session ID from the form and increment it
        let lastSessionId = $('#live_class_entries .live-class-entry:last input[name*="[session_id]"]').val();
        
        // Extract prefix and number (e.g., 'LS-1072' -> 'LS-' and '1072')
        let match = lastSessionId.match(/^([A-Za-z-]+)(\d+)$/);
        let newSessionId;
        
        if (match) {
            let prefix = match[1]; // 'LS-'
            let number = parseInt(match[2]); // 1072
            newSessionId = prefix + (number + 1); // 'LS-1073'
        } else {
            // Fallback if format doesn't match
            newSessionId = lastSessionId + '-' + entryCount;
        }
        
        let newEntry = `
            <div class="live-class-entry" data-entry="${entryCount}">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Live Class Entry #${entryCount}</h5>
                    <button type="button" class="btn btn-danger btn-sm remove_entry_btn">
                        <i class="ri-delete-bin-line"></i> Remove
                    </button>
                </div>
                
                <div class="row">
                    <div class="col-lg-6 p-2">
                        <label class="form-label">Session ID<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control" name="entries[${newIndex}][session_id]" required value="${newSessionId}" readonly>
                    </div>

                    <div class="col-lg-6 p-2">
                        <label class="form-label">Title<span class="required text-danger">*</span></label>
                        <input type="text" class="form-control" name="entries[${newIndex}][title]" required>
                    </div>

                    <div class="col-lg-6 p-2">
                        <label class="form-label">Date<span class="required text-danger">*</span></label>
                        <input type="date" class="form-control" name="entries[${newIndex}][date]" required>
                    </div>

                    <div class="col-lg-6 p-2">
                        <label class="form-label">From Time<span class="required text-danger">*</span></label>
                        <input type="time" class="form-control" name="entries[${newIndex}][fromTime]" required>
                    </div>

                    <div class="col-lg-6 p-2">
                        <label class="form-label">To Time<span class="required text-danger">*</span></label>
                        <input type="time" class="form-control" name="entries[${newIndex}][toTime]" required>
                    </div>

                    <div class="col-lg-6 p-2 d-flex align-items-center">
                        <input type="checkbox" id="is_repetitive_${newIndex}" name="entries[${newIndex}][is_repetitive]" class="me-2">
                        <label for="is_repetitive_${newIndex}" class="mb-0">Is Repetitive?</label>
                    </div>

                    <div class="col-lg-12 mt-3 repeat-dates-section" id="repeat_dates_section_${newIndex}" style="display: none;">
                        <label class="form-label">Select Multiple Dates</label>
                        <div class="date-fields-container">
                            <div class="input-group mb-2">
                                <input type="date" name="entries[${newIndex}][repeat_dates][]" class="form-control">
                                <button type="button" class="btn btn-success add_date_btn"><b>+</b></button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <hr class="my-4">
            </div>
        `;
        
        $('#live_class_entries').append(newEntry);
    });

    // Remove live class entry
    $(document).on('click', '.remove_entry_btn', function () {
        $(this).closest('.live-class-entry').remove();
        
        // Renumber remaining entries
        $('#live_class_entries .live-class-entry').each(function (index) {
            $(this).attr('data-entry', index + 1);
            $(this).find('h5').text('Live Class Entry #' + (index + 1));
        });
    });
});

$("#liveClassSubmitBtn").on("click", function (e) {
    e.preventDefault();

    var form = document.getElementById("addCohortLiveClassForm");
    var routeUrl = "<?=base_url('admin/Live_class/add')?>";
    
    ajax(form, routeUrl, $("#pills-activities-info-tab"));
});

function ajax(form, routeUrl, triggerId) {
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
                        let html = $('<div>').html(data);
                        let newContent = html.find(reload).html();
                        $(reload).html(newContent);
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