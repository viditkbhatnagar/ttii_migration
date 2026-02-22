<script type="text/javascript">
    window.addEventListener('DOMContentLoaded', function(event) {
        websdkready();
    });

    function websdkready() {
        console.log("checkSystemRequirements");
        console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));

        ZoomMtg.preLoadWasm(); // pre download wasm file to save time.
        <?php
        if (isset($live_class)){
            ?>
            var CLIENT_ID = "<?=get_settings('zoom_api_key');?>";
            var MEETING_NUMBER = "<?=$live_class['zoom_id']?>";
            var MEETING_PASS = "<?=$live_class['password']?>";

            var JOIN_URL = "<?=base_url('live/meeting/')?>";
            var SIGNATURE_URL = "<?=base_url('live/generate_signature')?>";
            var USER_NAME = "<?=base64_encode(get_settings('system_name'))?>"; // BASE 64 ENCODED
            var ROLE = "0"; //1 FOR HOST 0 FOR ATTEND, USE 0 FOR STUDENTS
            <?php
        }else{
            print "Please enter";
        }
        ?>



        generateSignature();

        function generateSignature() {
            var meeting_config = {
                'china' : "0",
                'email' : "",
                'lang' : "en-US",
                'mn' : MEETING_NUMBER,
                'name' : USER_NAME,
                'pwd' : MEETING_PASS,
                'role' : ROLE,
            };

            fetch(SIGNATURE_URL + "?meeting_number=" + encodeURIComponent(MEETING_NUMBER) + "&role=" + encodeURIComponent(ROLE))
                .then(function (res) { return res.json(); })
                .then(function (res) {
                    if (!res || Number(res.status) !== 1 || !res.data || !res.data.jwt_token) {
                        throw new Error('Failed to generate meeting signature');
                    }

                    meeting_config.signature = res.data.jwt_token;
                    meeting_config.sdkKey = CLIENT_ID;
                    var joinUrl = JOIN_URL + "?preview=<?=$_GET['preview'] ?? 1?>&" + testTool.serialize(meeting_config);
                    window.location.href = joinUrl;
                })
                .catch(function (err) {
                    console.error(err);
                    alert("Unable to start meeting. Please try again.");
                });
        }
    }
</script>
