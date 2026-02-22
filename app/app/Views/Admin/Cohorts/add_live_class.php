<form autocomplete="off"
      action="#"
      id="addCohortLiveClassForm"
      method="post"
      enctype="multipart/form-data">

    <input type="hidden" name="cohort_id" value="<?= $cohort_id ?>">

    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">

                    <!-- COMMON ZOOM DETAILS -->
                    <div class="row mb-4">
                        <div class="col-lg-6 p-2">
                            <label class="form-label">Zoom ID<span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="zoom_id"
                                   value="<?= $zoom_id ?>" readonly required>
                        </div>

                        <div class="col-lg-6 p-2">
                            <label class="form-label">Password<span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="password"
                                   value="<?= $zoom_password ?>" readonly required>
                        </div>
                    </div>

                    <hr>

                    <!-- LIVE CLASS ENTRIES -->
                    <div id="live_class_entries">

                        <!-- ENTRY 0 -->
                        <div class="live-class-entry" data-index="0">
                            <h5 class="mb-3">Live Class #1</h5>

                            <div class="row">
                                <div class="col-lg-6 p-2">
                                    <label>Session ID</label>
                                    <input type="text" class="form-control"
                                           name="entries[0][session_id]"
                                           value="<?= $session_id ?>" readonly required>
                                </div>

                                <div class="col-lg-6 p-2">
                                    <label>Title</label>
                                    <input type="text" class="form-control"
                                           name="entries[0][title]" required>
                                </div>

                                <div class="col-lg-4 p-2">
                                    <label>Date</label>
                                    <input type="date" class="form-control"
                                           name="entries[0][date]" required>
                                </div>

                                <div class="col-lg-4 p-2">
                                    <label>From Time</label>
                                    <input type="time" class="form-control"
                                           name="entries[0][fromTime]" required>
                                </div>

                                <div class="col-lg-4 p-2">
                                    <label>To Time</label>
                                    <input type="time" class="form-control"
                                           name="entries[0][toTime]" required>
                                </div>

                                <!-- REPETITIVE -->
                                <div class="col-lg-12 p-2">
                                    <input type="checkbox"
                                           class="is-repetitive"
                                           data-index="0">
                                    <label class="ms-1">Is Repetitive?</label>
                                </div>

                                <!-- REPEAT DATES -->
                                <div class="col-lg-12 repeat-section d-none" id="repeat_0">
                                    <label>Select Multiple Dates</label>
                                    <div class="repeat-dates">
                                        <div class="input-group mb-2">
                                            <input type="date"
                                                   name="entries[0][repeat_dates][]"
                                                   class="form-control">
                                            <button type="button"
                                                    class="btn btn-success add-date">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr>
                        </div>

                    </div>

                    <!-- ADD ENTRY -->
                    <div class="text-center">
                        <button type="button" id="add_entry"
                                class="btn btn-primary">
                            <i class="ri-add-line"></i> Add Another Live Class
                        </button>
                    </div>

                    <!-- SUBMIT -->
                    <div class="text-end mt-4">
                        <button type="button"
                                id="liveClassSubmitBtn"
                                class="btn btn-success">
                            Save All Entries
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
</form>
<script>
$(function () {

    let entryIndex = 1;

    /* TOGGLE REPETITIVE */
    $(document).on('change', '.is-repetitive', function () {
        let i = $(this).data('index');
        $('#repeat_' + i).toggleClass('d-none', !this.checked);
    });

    /* ADD DATE */
    $(document).on('click', '.add-date', function () {
        let parent = $(this).closest('.repeat-dates');
        let index  = $(this).closest('.live-class-entry').data('index');

        parent.append(`
            <div class="input-group mb-2">
                <input type="date" name="entries[${index}][repeat_dates][]" class="form-control">
                <button type="button" class="btn btn-danger remove-date">-</button>
            </div>
        `);
    });

    /* REMOVE DATE */
    $(document).on('click', '.remove-date', function () {
        $(this).closest('.input-group').remove();
    });

    /* ADD ENTRY */
    $('#add_entry').on('click', function () {

        let lastSession = $('input[name*="[session_id]"]').last().val();
        let match = lastSession.match(/(\D+)(\d+)/);
        let newSession = match ? match[1] + (parseInt(match[2]) + 1) : lastSession + '-' + entryIndex;

        $('#live_class_entries').append(`
            <div class="live-class-entry" data-index="${entryIndex}">
                <h5 class="mb-3">Live Class #${entryIndex + 1}</h5>

                <div class="row">
                    <div class="col-lg-6 p-2">
                        <label>Session ID</label>
                        <input type="text" class="form-control"
                               name="entries[${entryIndex}][session_id]"
                               value="${newSession}" readonly>
                    </div>

                    <div class="col-lg-6 p-2">
                        <label>Title</label>
                        <input type="text" class="form-control"
                               name="entries[${entryIndex}][title]" required>
                    </div>

                    <div class="col-lg-4 p-2">
                        <input type="date" class="form-control"
                               name="entries[${entryIndex}][date]" required>
                    </div>

                    <div class="col-lg-4 p-2">
                        <input type="time" class="form-control"
                               name="entries[${entryIndex}][fromTime]" required>
                    </div>

                    <div class="col-lg-4 p-2">
                        <input type="time" class="form-control"
                               name="entries[${entryIndex}][toTime]" required>
                    </div>

                    <div class="col-lg-12 p-2">
                        <input type="checkbox"
                               class="is-repetitive"
                               data-index="${entryIndex}">
                        <label class="ms-1">Is Repetitive?</label>
                    </div>

                    <div class="col-lg-12 repeat-section d-none" id="repeat_${entryIndex}">
                        <div class="repeat-dates">
                            <div class="input-group mb-2">
                                <input type="date"
                                       name="entries[${entryIndex}][repeat_dates][]"
                                       class="form-control">
                                <button type="button" class="btn btn-success add-date">+</button>
                            </div>
                        </div>
                    </div>
                </div>
                <hr>
            </div>
        `);

        entryIndex++;
    });

    /* AJAX SUBMIT */
    $(document)
    .off('click', '#liveClassSubmitBtn')
    .on('click', '#liveClassSubmitBtn', function (e) {
        e.preventDefault();

        let formData = new FormData($('#addCohortLiveClassForm')[0]);

        $.ajax({
            url: "<?= base_url('admin/Live_class/add') ?>",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",
            success(res) {
                Swal.fire('Success', res.message, 'success');
                $('#ajax_modal').modal('hide');
            },
            error() {
                Swal.fire('Error', 'Submission failed', 'error');
            }
        });
    });


});
</script>
