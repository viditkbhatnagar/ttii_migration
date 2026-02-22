<!-- Normal Modal -->
<div id="small_modal" class="modal fade" tabindex="-1" aria-labelledby="small_modal_label" aria-hidden="true" style="display: none;" role="dialog">
    <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header bg-primary-subtle p-2">
                <h5 class="modal-title" id="small-modal-title"></h5>
                <button type="button" class="btn-close text-danger" data-bs-dismiss="modal" aria-label="Close"> </button>
            </div>
            <div class="modal-body" id="small-modal-content">

            </div>

        </div><!-- /.modal-content -->
    </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

<!-- Ajax Modal -->
<div id="ajax_modal" class="modal fade" tabindex="-1" aria-labelledby="ajax_modal_label" aria-hidden="true" style="display: none;" role="dialog">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header bg-primary-subtle p-2">
                <h5 class="modal-title" id="ajax-modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"> </button>
            </div>
            <div class="modal-body" id="ajax-modal-content">

            </div>

        </div><!-- /.modal-content -->
    </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

<!-- X-Large Modal -->
<div id="large_modal" class="modal fade" tabindex="-1" aria-labelledby="large_modal_label" aria-hidden="true" style="display: none;" role="dialog">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header bg-primary-subtle p-2">
                <h5 class="modal-title" id="large-modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"> </button>
            </div>
            <div class="modal-body" id="large-modal-content">

            </div>

        </div><!-- /.modal-content -->
    </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

<!-- X-Large Modal -->
<div id="full_modal" class="modal fade" tabindex="-1" aria-labelledby="full_modal_label" aria-hidden="true" style="display: none;" role="dialog">
    <div class="modal-dialog modal-fullscreen modal-dialog-scrollable mx-auto" style="max-width: 1200px;">
        <div class="modal-content">
            <div class="modal-header bg-primary-subtle p-2">
                <h5 class="modal-title" id="full-modal-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"> </button>
            </div>
            <div class="modal-body" id="full-modal-content">

            </div>

        </div><!-- /.modal-content -->
    </div><!-- /.modal-dialog -->
</div><!-- /.modal -->

<!-- Image Modal -->
<div id="image_modal" class="modal fade" tabindex="-1" aria-labelledby="small_modal_label" aria-hidden="true" style="display: none;" role="dialog">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-body d-flex">
            <img class="modal-content" id="image-preview">
            <button type="button" class="btn-close ms-auto text-white" data-bs-dismiss="modal" aria-label="Close" style="font-size: 1.5rem;"></button>
        </div>
    </div>
</div>


<script type="text/javascript">
    function show_small_modal(url, header)
    {
        // SHOWING AJAX PRELOADER IMAGE
        $('#small-modal-content').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#small-modal-title').html('Loading...');
        // LOADING THE AJAX MODAL
        $('#small_modal').modal({
            backdrop: 'static',
            keyboard: false
        });
        $('#small_modal').modal('show');

        // jQuery('#scrollable-modal').modal({backdrop: 'static', keyboard: false}).show();

        // SHOW AJAX RESPONSE ON REQUEST SUCCESS
        
        call_ajax_view(url, '#small-modal-content');
        $('#small-modal-title').html(header);

    }

    function show_ajax_modal(url, header)
    {

        // SHOWING AJAX PRELOADER IMAGE
        $('#ajax-modal-content').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#ajax-modal-title').html('Loading...');
        // LOADING THE AJAX MODAL
        $('#ajax_modal').modal({
            backdrop: 'static',
            keyboard: false
        });
        $('#ajax_modal').modal('show');
        call_ajax_view(url, '#ajax-modal-content');
        $('#ajax-modal-title').html(header);
    }

    function show_large_modal(url, header)
    {
        // SHOWING AJAX PRELOADER IMAGE
        $('#large-modal-content').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#large-modal-title').html('Loading...');
        // LOADING THE AJAX MODAL
        $('#large_modal').modal({
            backdrop: 'static',
            keyboard: false
        });
        $('#large_modal').modal('show');

        // jQuery('#scrollable-modal').modal({backdrop: 'static', keyboard: false}).show();

        // SHOW AJAX RESPONSE ON REQUEST SUCCESS
        call_ajax_view(url, '#large-modal-content');
        $('#large-modal-title').html(header);
    }

    function show_full_modal(url, header)
    {
        // SHOWING AJAX PRELOADER IMAGE
        $('#full-modal-content').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#full-modal-title').html('Loading...');
        // LOADING THE AJAX MODAL
        $('#full_modal').modal({
            backdrop: 'static',
            keyboard: false
        });
        $('#full_modal').modal('show');

        // jQuery('#scrollable-modal').modal({backdrop: 'static', keyboard: false}).show();

        // SHOW AJAX RESPONSE ON REQUEST SUCCESS
        call_ajax_view(url, '#full-modal-content');
        $('#full-modal-title').html(header);
    }

    function alert_modal_success(message = '', message_title = 'Success!', cancel_button = 'Okay') {
        Swal.fire({
            html: '<div class="mt-3">' +
                '<lord-icon src="https://cdn.lordicon.com/lupuorrc.json" trigger="loop" colors="primary:#0ab39c,secondary:#405189" style="width:120px;height:120px"></lord-icon>' +
                '<div class="mt-4 pt-2 fs-15">' +
                '<h4>' + message_title + '</h4>' +
                '<p class="text-muted mx-4 mb-0">' + message + '</p>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            showConfirmButton: false,
            cancelButtonClass: 'btn btn-success w-xs mb-1',
            cancelButtonText: cancel_button,
            buttonsStyling: false,
            showCloseButton: true
        })
    }
    function alert_modal_error(message = 'Something went wrong..!', cancel_button = 'Okay') {
        Swal.fire({
            html: '<div class="mt-3">' +
                '<lord-icon src="https://cdn.lordicon.com/tdrtiskw.json" trigger="loop" colors="primary:#f06548,secondary:#f7b84b" style="width:120px;height:120px"></lord-icon>' +
                '<div class="mt-4 pt-2 fs-15">' +
                '<h2>Oops...!</h2>' +
                '<p class="text-muted mx-4 mb-0">' + message +'</p>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            showConfirmButton: false,
            cancelButtonClass: 'btn btn-danger1 btn-outline-danger w-xs mb-1',
            cancelButtonText: 'Dismiss',
            buttonsStyling: false,
            showCloseButton: true
        })
    }
    function confirm_modal(
        message = 'Are you Sure ?',
        message_description = 'Are you Sure You want to Delete this Account ?',
        button_text = 'Yes, Delete It!'
    ) {
        Swal.fire({
            html: '<div class="mt-3">' +
                '<lord-icon src="https://cdn.lordicon.com/gsqxdxog.json" trigger="loop" colors="primary:#f7b84b,secondary:#f06548" style="width:100px;height:100px"></lord-icon>' +
                '<div class="mt-4 pt-2 fs-15 mx-5">' +
                '<h4>' + message + '</h4>' +
                '<p class="text-muted mx-4 mb-0"> ' + message_description + '</p>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            confirmButtonClass: 'btn btn-primary w-xs me-2 mb-1',
            confirmButtonText: button_text,
            cancelButtonClass: 'btn btn-danger w-xs mb-1',
            buttonsStyling: false,
            showCloseButton: true
        })
    }

    function delete_modal(
        delete_url,
        message = 'Are you Sure ?',
        message_description = 'Are you Sure You want to Delete this?',
        button_text = 'Yes, Delete It!'
    ) {
        Swal.fire({
            html: '<div class="mt-3">' +
                '<lord-icon src="https://cdn.lordicon.com/gsqxdxog.json" trigger="loop" colors="primary:#f7b84b,secondary:#f06548" style="width:100px;height:100px"></lord-icon>' +
                '<div class="mt-4 pt-2 fs-15 mx-5">' +
                '<h4>' + message + '</h4>' +
                '<p class="text-muted mx-4 mb-0"> ' + message_description + '</p>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            confirmButtonClass: 'btn btn-primary w-xs me-2 mb-1',
            confirmButtonText: button_text,
            cancelButtonClass: 'btn btn-danger w-xs mb-1',
            buttonsStyling: false,
            showCloseButton: true,
            preConfirm: () => {
                window.location.href = delete_url;
            }
        })
    }
    
    
     function approve_modal(
        approve_url,
        message = 'Are you Sure ?',
        message_description = 'Are you Sure You want to Approve this?',
        button_text = 'Yes, Approve It!'
    ) {
        Swal.fire({
            html: '<div class="mt-3">' +
                '<lord-icon src="https://cdn.lordicon.com/cgzlioyf.json" trigger="loop" delay="2000" stroke="bold" state="hover-loading" colors="primary:#109121" style="width:150px;height:150px"></lord-icon>' +
                '<div class="mt-4 pt-2 fs-15 mx-5">' +
                '<h4>' + message + '</h4>' +
                '<p class="text-muted mx-4 mb-0"> ' + message_description + '</p>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            confirmButtonClass: 'btn btn-success w-xs me-2 mb-1',
            confirmButtonText: button_text,
            cancelButtonClass: 'btn btn-danger w-xs mb-1',
            buttonsStyling: false,
            showCloseButton: true,
            preConfirm: () => {
                window.location.href = approve_url;
            }
        })
    }
    
    
    
    function reject_modal(
        reject_url,
        message = 'Are you Sure ?',
        message_description = 'Are you Sure You want to Reject this?',
        button_text = 'Yes, Reject It!'
    ) {
        Swal.fire({
            html: '<div class="mt-3">' +
                '<lord-icon src="https://cdn.lordicon.com/krenhavm.json" trigger="loop" colors="primary:#e83a30,secondary:#c71f16" style="width:150px;height:150px"></lord-icon>' +
                '<div class="mt-4 pt-2 fs-15 mx-5">' +
                '<h4>' + message + '</h4>' +
                '<p class="text-muted mx-4 mb-0"> ' + message_description + '</p>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            confirmButtonClass: 'btn btn-danger w-xs me-2 mb-1',
            confirmButtonText: button_text,
            cancelButtonClass: 'btn btn-primary w-xs mb-1',
            buttonsStyling: false,
            showCloseButton: true,
            preConfirm: () => {
                window.location.href = reject_url;
            }
        })
    }
    
    
    function request_modal(
        request_url,
        message = 'Are you Sure ?',
        message_description = 'Are you Sure You want to Request for Node Access?',
        button_text = 'Yes, Continue!'
    ) {
        Swal.fire({
            html: '<div class="mt-3">' +
                '<lord-icon src="https://cdn.lordicon.com/cgzlioyf.json" trigger="loop" delay="2000" stroke="bold" state="hover-loading" colors="primary:#109121" style="width:150px;height:150px"></lord-icon>' +
                '<div class="mt-4 pt-2 fs-15 mx-5">' +
                '<h4>' + message + '</h4>' +
                '<p class="text-muted mx-4 mb-0"> ' + message_description + '</p>' +
                '</div>' +
                '</div>',
            showCancelButton: true,
            confirmButtonClass: 'btn btn-success w-xs me-2 mb-1',
            confirmButtonText: button_text,
            cancelButtonClass: 'btn btn-danger w-xs mb-1',
            buttonsStyling: false,
            showCloseButton: true,
            preConfirm: () => {
                window.location.href = request_url;
            }
        })
    }
    
    function image_small_modal(imageUrl) 
    {
        // SET IMAGE SOURCE
        $('#image-preview').attr('src', imageUrl);

        // SHOW MODAL
        $('#image_modal').modal('show');
    }
</script>